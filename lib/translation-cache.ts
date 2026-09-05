import type { Locale } from "@/lib/i18n";
import { browserStorage, readStored, writeStored } from "@/lib/local-store";

/**
 * Where a translated itinerary is kept so it is only paid for once.
 *
 * Translation costs real tokens against a tight per-minute budget, so
 * re-translating the same trip every time someone flips the language switch
 * would be both slow and wasteful. Nothing is written to the database: a
 * translation is a view of a trip, not part of it, and storing it would mean a
 * migration plus rows to keep in step with the original.
 *
 * Saved trips have a stable id and are worth keeping across visits, so they go
 * in `localStorage`. An unsaved trip only exists for as long as its tab does —
 * it lives in `sessionStorage` itself — so its translation goes there too and
 * disappears with it.
 */

const PREFIX = "tripmate:translated";

export function translationKey(
  tripKey: string,
  target: Locale,
): string {
  return `${PREFIX}:${tripKey}:${target}`;
}

/** Saved trips persist; unsaved ones last only as long as the tab. */
function storeFor(tripId: string | undefined): Storage | null {
  return browserStorage(tripId ? "local" : "session");
}

/**
 * The stored value as its raw string, or null.
 *
 * Raw rather than parsed so it can be a `useSyncExternalStore` snapshot, which
 * is compared by identity — see `lib/local-store.ts`.
 */
export function readTranslationRaw(
  key: string,
  tripId: string | undefined,
): string | null {
  return readStored(storeFor(tripId), key);
}

export function parseTranslation(raw: string | null): string[] | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) && parsed.every((v) => typeof v === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function writeTranslation(
  key: string,
  tripId: string | undefined,
  strings: string[],
): void {
  writeStored(storeFor(tripId), key, JSON.stringify(strings));
}
