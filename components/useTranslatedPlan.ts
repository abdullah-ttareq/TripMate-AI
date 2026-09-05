"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { subscribeToStorage } from "@/lib/local-store";
import { planLocale, planStrings, withStrings } from "@/lib/translatable";
import {
  parseTranslation,
  readTranslationRaw,
  translationKey,
  writeTranslation,
} from "@/lib/translation-cache";
import type { TripPlan } from "@/lib/schema";

/** Matches the server's per-request cap in lib/translate.ts. */
const CHUNK_SIZE = 20;

export type TranslationState = "idle" | "working" | "partial";

/**
 * Shows a plan in the language the reader has selected.
 *
 * The trip itself is never regenerated. Its text is translated in place, so a
 * reader switching language sees the same itinerary in another language rather
 * than a different itinerary.
 *
 * The cache is the single source of truth for a finished translation: the
 * fetch writes into it and the component reads out of it, so there is no
 * second copy in component state to keep in step. A cached trip therefore
 * renders translated on the very first paint, with no request at all.
 *
 * Chunked and sequential on purpose. Groq's free tier counts a minute's tokens
 * across the whole project, so firing every chunk at once would rate-limit the
 * later ones — and a rate limit stops the loop rather than burning what is
 * left of the budget on requests that cannot succeed. Whatever was translated
 * before that point is kept and reported as `partial`.
 */
export function useTranslatedPlan(
  plan: TripPlan,
  tripId?: string,
): { plan: TripPlan; state: TranslationState } {
  const { locale } = useLocale();

  // The key a translation attempt gave up on, rather than a boolean, so it
  // resets by itself when the trip or the language changes.
  const [failedFor, setFailedFor] = useState<string | null>(null);

  const sourceLocale = planLocale(plan);
  const needsTranslation = sourceLocale !== locale;

  // Identifies this trip's text well enough to cache against, without putting
  // the whole itinerary in the key.
  const tripKey = tripId ?? `${plan.title}:${plan.itinerary.length}`;
  const storageKey = translationKey(tripKey, locale);

  // Read as an external store rather than copied into state on mount, which
  // would render the untranslated trip first and correct it a moment later.
  const cachedRaw = useSyncExternalStore(
    subscribeToStorage,
    useCallback(
      () => (needsTranslation ? readTranslationRaw(storageKey, tripId) : null),
      [needsTranslation, storageKey, tripId],
    ),
    () => null,
  );

  const cached = useMemo(() => parseTranslation(cachedRaw), [cachedRaw]);

  useEffect(() => {
    if (!needsTranslation || cached) return;

    let cancelled = false;

    async function run() {
      const originals = planStrings(plan);
      const result = [...originals];
      let complete = true;

      for (let start = 0; start < originals.length; start += CHUNK_SIZE) {
        if (cancelled) return;

        const chunk = originals.slice(start, start + CHUNK_SIZE);

        try {
          const response = await fetch("/api/trips/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: chunk, target: locale }),
          });

          if (!response.ok) {
            // Out of budget for this minute. Stop rather than spend the rest
            // of it on requests that are already going to fail.
            complete = false;
            break;
          }

          const data = await response.json();

          if (Array.isArray(data.items) && data.items.length === chunk.length) {
            result.splice(start, chunk.length, ...data.items);
          } else {
            complete = false;
          }
        } catch {
          complete = false;
          break;
        }
      }

      if (cancelled) return;

      // Only a complete translation is cached. Storing a partial one would
      // make the untranslated remainder permanent for this trip.
      if (complete) {
        writeTranslation(storageKey, tripId, result);
      } else {
        setFailedFor(storageKey);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // `plan` is rebuilt on every render but its content only changes when the
    // trip does, which storageKey already tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, needsTranslation, cached, locale, tripId]);

  if (!needsTranslation) return { plan, state: "idle" };

  if (cached) return { plan: withStrings(plan, cached), state: "idle" };

  // Derived rather than stored: with no cache entry, this trip is either still
  // being translated or has already given up on this exact key. Keeping it out
  // of state means nothing has to be reset when the language changes.
  //
  // The original text is shown meanwhile rather than a spinner in place of the
  // trip: it is readable either way, and the banner above it says what is
  // happening.
  return {
    plan,
    state: failedFor === storageKey ? "partial" : "working",
  };
}
