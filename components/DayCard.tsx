"use client";

import Image from "next/image";
import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { formatMoney } from "@/lib/format";
import { googleMapsUrl } from "@/lib/maps";
import type { ResolvedPlace } from "@/lib/places";
import type { PhotoSource } from "@/lib/wikimedia";
import type { Activity, Day } from "@/lib/schema";

/**
 * One day, collapsed by default.
 *
 * A ten-day trip used to render as a wall of text before the reader saw
 * anything. Showing the day's title and cost first, with the activity list one
 * tap away, makes the whole plan scannable at a glance.
 */
export default function DayCard({
  day,
  places,
}: {
  day: Day;
  places: Record<string, ResolvedPlace>;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-primary/40">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-primary">
          {day.day}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{day.title}</span>
          <span className="mt-0.5 block text-sm text-muted">
            {day.activities.length}{" "}
            {day.activities.length === 1 ? t.result.activity : t.result.activities}
          </span>
        </span>

        <span dir="auto" className="shrink-0 text-sm text-accent-text">
          {formatMoney(day.estimatedCost, locale, t.common.sar)}
        </span>

        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform rtl:-scale-x-100 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4">
          <p className="leading-relaxed text-muted">{day.description}</p>

          {day.activities.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {day.activities.map((activity, index) => (
                <ActivityRow
                  key={index}
                  activity={activity}
                  place={activity.place ? places[activity.place] : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One activity.
 *
 * Two shapes, chosen by whether the place behind it could be verified. An
 * activity whose place did not resolve — or which was never tied to a named
 * place at all, like checking in — renders exactly as it did before place
 * grounding existed. Nothing is invented to fill the richer layout.
 */
function ActivityRow({
  activity,
  place,
}: {
  activity: Activity;
  place: ResolvedPlace | undefined;
}) {
  if (!place) {
    return (
      <li className="flex gap-3 text-sm">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        <span>{activity.text}</span>
      </li>
    );
  }

  return (
    <li className="flex gap-3.5 rounded-xl border border-line bg-surface-2 p-3">
      <PlaceThumbnail place={place} />

      <div className="min-w-0 flex-1">
        <p dir="auto" className="truncate font-medium">
          {place.name}
        </p>

        <p className="mt-0.5 text-sm text-muted">{activity.text}</p>

        {/*
          `dir="auto"` because a resolved address is Latin script even in the
          Arabic interface. Without it the house number and commas are pulled
          to the wrong end of the line by the surrounding right-to-left text.
        */}
        {place.address && (
          <p dir="auto" className="mt-1 truncate text-xs text-muted">
            {place.address}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <MapsLink place={place} />

          {place.photo && (
            <PhotoCredit
              href={place.photo.articleUrl}
              source={place.photo.source}
            />
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The place's own photograph, or the gradient placeholder.
 *
 * The placeholder is not a fallback of last resort — it is the correct answer
 * whenever no photograph could be confidently tied to this place. Showing a
 * plausible-looking photograph of somewhere else would be worse than showing
 * no photograph at all.
 */
function PlaceThumbnail({ place }: { place: ResolvedPlace }) {
  if (!place.photo) {
    return (
      <div
        aria-hidden
        className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-primary via-primary-hover to-accent"
      />
    );
  }

  return (
    <Image
      src={place.photo.url}
      alt={place.name}
      width={64}
      height={64}
      // `unoptimized` keeps the browser loading the image straight from
      // Wikimedia. Next's optimizer would otherwise fetch each photograph and
      // cache a copy on our own server, which is exactly the kind of storing
      // the provider's terms govern. Hotlinking with attribution is what they
      // ask for, and the thumbnails are already small.
      unoptimized
      className="h-16 w-16 shrink-0 rounded-lg object-cover"
    />
  );
}

function MapsLink({ place }: { place: ResolvedPlace }) {
  const { t } = useLocale();

  return (
    <a
      href={googleMapsUrl(place)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>

      {t.result.viewOnMaps}
    </a>
  );
}

/** Attribution back to the page carrying the image's authorship and licence. */
function PhotoCredit({
  href,
  source,
}: {
  href: string;
  source: PhotoSource;
}) {
  const { t } = useLocale();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-muted underline-offset-2 hover:underline"
    >
      {source === "commons" ? t.result.photoViaCommons : t.result.photoVia}
    </a>
  );
}
