"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { useLocale } from "@/components/LocaleProvider";
import SaveTripButton from "@/components/SaveTripButton";
import TripResult from "@/components/TripResult";
import { subscribeToStorage } from "@/lib/local-store";
import { parseLastTrip, readLastTripRaw } from "@/lib/storage";

export default function ResultPage() {
  const { t } = useLocale();

  // sessionStorage only exists in the browser, so the server snapshot is
  // `undefined` — "still reading" — and the first client render replaces it
  // with the real value. Reading the store directly rather than copying it
  // into state on mount avoids rendering "no trip" for a frame first.
  const raw = useSyncExternalStore(
    subscribeToStorage,
    readLastTripRaw,
    () => undefined,
  );

  // undefined = still reading, null = nothing to show.
  const trip = useMemo(
    () => (raw === undefined ? undefined : parseLastTrip(raw)),
    [raw],
  );

  return (
    <main className="flex-1 px-6 py-12">
      {trip === undefined && <Message text={t.result.loading} />}

      {trip === null && (
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-3xl">{t.result.noTripTitle}</h1>

          <p className="mt-3 text-muted">{t.result.noTripBody}</p>

          <Link
            href="/plan"
            className="mt-8 inline-block rounded-full bg-primary px-7 py-3.5 font-medium text-primary-fg transition hover:bg-primary-hover"
          >
            {t.result.planTrip}
          </Link>
        </div>
      )}

      {trip && <TripResult trip={trip} actions={<SaveTripButton trip={trip} />} />}
    </main>
  );
}

function Message({ text }: { text: string }) {
  return <p className="text-center text-muted">{text}</p>;
}
