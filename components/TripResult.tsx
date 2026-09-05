"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import DayCard from "@/components/DayCard";
import LocalEssentials from "@/components/LocalEssentials";
import { useLocale } from "@/components/LocaleProvider";
import TripChecklist from "@/components/TripChecklist";
import UsefulApps from "@/components/UsefulApps";
import { useTranslatedPlan } from "@/components/useTranslatedPlan";
import type { ResolvedCountry } from "@/lib/data/country-facts";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { ResolvedPlace } from "@/lib/places";
import type { GeneratedTrip } from "@/lib/schema";

/**
 * MapLibre is by far the largest thing on this page, and most readers never
 * open the map. Loading it only when the tab is selected keeps it out of the
 * initial bundle entirely.
 */
const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });

type Enrichment = {
  places: Record<string, ResolvedPlace>;
  destination: ResolvedCountry | null;
};

/**
 * Renders a generated trip. Used by both /result (unsaved, from
 * sessionStorage) and /result/[id] (saved, from Supabase), so it takes the
 * trip as data and knows nothing about where it came from.
 *
 * The page is built as a sequence of sections — overview, days, apps,
 * essentials, checklist, tips — rather than one long column, so that the
 * information added around the itinerary stays findable instead of turning
 * into a wall.
 */
export default function TripResult({
  trip,
  tripId,
  actions,
}: {
  trip: GeneratedTrip;
  /** Present for a saved trip; drives cache keys for translation and ticks. */
  tripId?: string;
  actions?: React.ReactNode;
}) {
  const { t, locale } = useLocale();
  const { input } = trip;

  // Shown in the reader's language, translated in place rather than
  // regenerated, so switching language keeps the same trip.
  const { plan, state: translation } = useTranslatedPlan(trip.plan, tripId);

  const enrichment = usePlaceEnrichment(trip.plan);
  const places = enrichment?.places ?? {};

  const tripKey = tripId ?? `${trip.plan.title}:${trip.plan.itinerary.length}`;

  const [view, setView] = useState<"days" | "map">("days");

  // The tab appears once enrichment has finished, whether or not it found
  // anything: `enrichment` is null only while the lookup is still running, and
  // offering a Map tab before then would open onto an empty map that is about
  // to fill itself.
  const mappable = enrichment !== null;

  return (
    <div className="mx-auto max-w-4xl">

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent-text">
            <bdi>{input.from}</bdi> → <bdi>{plan.destination}</bdi>
          </p>

          <h1 className="font-display mt-4 text-3xl sm:text-4xl lg:text-5xl">
            {plan.title}
          </h1>

          <p className="mt-3 text-muted">
            {t.result.departing} {formatDate(input.departureDate, locale)}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {actions}

          <Link
            href="/plan"
            className="rounded-full border border-line px-6 py-3 text-center transition hover:bg-surface-2"
          >
            {t.result.planAnother}
          </Link>
        </div>
      </div>

      {translation !== "idle" && (
        <p className="mt-6 rounded-2xl border border-line bg-surface-2 p-4 text-sm text-muted">
          {translation === "working" ? t.translate.working : t.translate.failed}
        </p>
      )}

      {plan.budgetWarning && (
        <div className="mt-8 rounded-2xl border border-warning/30 bg-warning-soft p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-warning">
            {t.result.budgetNote}
          </p>
          <p className="mt-2 text-ink">{plan.budgetWarning}</p>
        </div>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat label={t.result.destination} value={plan.destination} />
        <Stat
          label={t.result.duration}
          value={`${formatNumber(plan.days, locale)} ${plan.days === 1 ? t.result.day : t.result.days}`}
        />
        <Stat
          label={t.result.estimatedCost}
          value={formatMoney(plan.estimatedBudget, locale, t.common.sar)}
          highlight
        />
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {mappable ? (
            <div className="flex gap-2" role="tablist">
              <Tab
                label={t.result.yourDays}
                selected={view === "days"}
                onSelect={() => setView("days")}
              />
              <Tab
                label={t.result.mapTab}
                selected={view === "map"}
                onSelect={() => setView("map")}
              />
            </div>
          ) : (
            <h2 className="font-display text-2xl sm:text-3xl">
              {t.result.yourDays}
            </h2>
          )}

          <p className="text-sm text-muted">
            {view === "days" ? t.result.tapHint : t.result.mapHint}
          </p>
        </div>

        {view === "map" && (
          <div className="mt-6">
            <TripMap days={plan.itinerary} places={places} />
          </div>
        )}

        <div className={`mt-6 space-y-3 ${view === "map" ? "hidden" : ""}`}>
          {/*
            Keyed by position, not by `day.day`. The day number comes from the
            model and has been observed to repeat on long trips, which made
            React collapse two different days into one key. Position is
            generated here and cannot collide; the validation in lib/ai.ts is
            the other half of this fix.
          */}
          {plan.itinerary.map((day, index) => (
            <DayCard key={index} day={day} places={places} />
          ))}
        </div>
      </section>

      <UsefulApps countryCode={enrichment?.destination?.countryCode} />

      <LocalEssentials facts={enrichment?.destination} />

      <TripChecklist tripKey={tripKey} facts={enrichment?.destination} />

      {plan.travelTips.length > 0 && (
        <section className="mt-12 rounded-[1.75rem] border border-line bg-surface p-7">
          <h2 className="font-display text-2xl">{t.result.goodToKnow}</h2>

          <ul className="mt-5 space-y-3 text-muted">
            {plan.travelTips.map((tip, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

/**
 * Looks up the real-world places this itinerary names, and the facts about the
 * country it is in.
 *
 * Deliberately runs after the trip is already on screen. Enrichment is an
 * enhancement, so it must never delay the itinerary or be able to prevent it
 * from rendering — a failure here simply leaves the result empty and every
 * activity falls back to plain text.
 *
 * It is given the *original* plan rather than the translated one, because the
 * place names it sends are lookup keys pinned to English. Translating them
 * first would break every match.
 */
function usePlaceEnrichment(plan: GeneratedTrip["plan"]): Enrichment | null {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);

  const names = plan.itinerary
    .flatMap((day) => day.activities)
    .map((activity) => activity.place)
    .filter((place): place is string => Boolean(place));

  // The request body doubles as the effect's dependency: it is a string, so it
  // only changes when the destination or the set of places actually changes —
  // not on every render that happens to rebuild an equal array.
  const payload = JSON.stringify({
    destination: plan.destination,
    places: [...new Set(names)].sort(),
  });

  useEffect(() => {
    // Set when the effect is torn down, so a response arriving after the user
    // has navigated away is discarded.
    let cancelled = false;

    fetch("/api/trips/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
      .then((response) =>
        response.ok ? response.json() : { places: {}, destination: null },
      )
      .then((data) => {
        if (cancelled) return;

        setEnrichment({
          places: data.places ?? {},
          destination: data.destination ?? null,
        });
      })
      .catch(() => {
        // Nothing to show the user: the itinerary is already complete without
        // this, and an error banner would imply something is broken.
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  return enrichment;
}

/** One of the two views over the itinerary. */
function Tab({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`font-display text-2xl transition sm:text-3xl ${
        selected ? "text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p
        dir="auto"
        className={`font-display mt-2 text-xl ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
