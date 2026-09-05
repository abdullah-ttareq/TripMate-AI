import type { Metadata } from "next";
import Link from "next/link";

import DeleteTripButton from "@/components/DeleteTripButton";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Trips",
};

export default async function MyTripsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getDictionary(locale);

  // Row Level Security limits this to the signed-in user's rows, so there is
  // no user_id filter to write here.
  const { data: trips, error } = await supabase
    .from("trips")
    .select("id, title, destination, days, estimated_budget, departure_date")
    .order("created_at", { ascending: false });

  return (
    <main className="flex-1 px-6 py-16 sm:px-8">
      <div className="mx-auto max-w-5xl">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-accent-text">
              {t.myTrips.eyebrow}
            </p>

            <h1 className="font-display mt-4 text-3xl sm:text-4xl lg:text-5xl">
              {t.myTrips.title}
            </h1>

            <p className="mt-3 text-muted">
              {trips?.length
                ? `${trips.length} ${trips.length === 1 ? t.myTrips.countOne : t.myTrips.countMany}`
                : t.myTrips.emptyLede}
            </p>
          </div>

          <Link
            href="/plan"
            className="rounded-full bg-primary px-7 py-3.5 text-center font-medium text-primary-fg transition hover:bg-primary-hover"
          >
            {t.myTrips.planNew}
          </Link>
        </div>

        {error && (
          <p className="mt-12 rounded-2xl border border-danger/30 bg-danger-soft p-5 text-danger">
            {t.myTrips.loadError}
          </p>
        )}

        {!error && trips?.length === 0 && (
          <div className="mt-12 rounded-[1.75rem] border border-dashed border-line p-14 text-center">
            <h2 className="font-display text-2xl">{t.myTrips.emptyTitle}</h2>

            <p className="mx-auto mt-3 max-w-sm text-muted">
              {t.myTrips.emptyBody}
            </p>
          </div>
        )}

        {!error && trips && trips.length > 0 && (
          <section className="mt-12 grid gap-6 md:grid-cols-2">
            {trips.map((trip) => (
              <article
                key={trip.id}
                className="flex flex-col rounded-[1.75rem] border border-line bg-surface p-7 transition hover:border-primary/40"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-accent-text">
                  {trip.destination}
                </p>

                <h2 className="font-display mt-3 text-2xl">{trip.title}</h2>

                <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
                  <div>
                    <dt className="inline">{t.myTrips.duration}: </dt>
                    <dd className="inline text-ink">
                      {formatNumber(trip.days, locale)}{" "}
                      {trip.days === 1 ? t.myTrips.day : t.myTrips.days}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">{t.myTrips.cost}: </dt>
                    <dd className="inline text-ink">
                      {formatMoney(trip.estimated_budget, locale, t.common.sar)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">{t.myTrips.departs}: </dt>
                    <dd className="inline text-ink">
                      {formatDate(trip.departure_date, locale)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-7 flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={`/result/${trip.id}`}
                    className="rounded-full border border-line px-6 py-2.5 text-sm transition hover:bg-surface-2"
                  >
                    {t.myTrips.view}
                  </Link>

                  <DeleteTripButton tripId={trip.id} title={trip.title} />
                </div>
              </article>
            ))}
          </section>
        )}

      </div>
    </main>
  );
}
