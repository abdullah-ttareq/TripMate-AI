import Link from "next/link";
import { notFound } from "next/navigation";

import DeleteTripButton from "@/components/DeleteTripButton";
import TripResult from "@/components/TripResult";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { generatedTripSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * A saved trip, loaded on the server. Unlike /result, which reads a
 * freshly generated trip out of sessionStorage, this one has a permanent URL
 * the user can return to.
 */
export default async function SavedTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getDictionary(locale);

  // Row Level Security scopes this to the signed-in user, so another user's
  // id simply comes back empty.
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Could not load the saved trip.", error);

    return (
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-3xl">{t.result.loadFailTitle}</h1>

          <p className="mt-3 text-muted">{t.result.loadFailBody}</p>

          <Link
            href="/my-trips"
            className="mt-8 inline-block rounded-full bg-primary px-7 py-3.5 font-medium text-primary-fg transition hover:bg-primary-hover"
          >
            {t.result.backToTrips}
          </Link>
        </div>
      </main>
    );
  }

  if (!data) notFound();

  const trip = generatedTripSchema.parse({
    input: {
      from: data.from_location,
      destination: data.destination,
      departureDate: data.departure_date,
      budget: data.budget,
      days: data.days,
    },
    plan: {
      title: data.title,
      destination: data.destination,
      days: data.days,
      estimatedBudget: data.estimated_budget,
      budgetWarning: data.budget_warning,
      itinerary: data.itinerary,
      travelTips: data.travel_tips,
    },
  });

  return (
    <main className="flex-1 px-6 py-12">
      <TripResult
        trip={trip}
        tripId={id}
        actions={
          <>
            <DeleteTripButton
              tripId={id}
              title={data.title}
              redirectTo="/my-trips"
            />

            <Link
              href="/my-trips"
              className="rounded-full border border-line px-6 py-3 text-center transition hover:bg-surface-2"
            >
              {t.result.myTrips}
            </Link>
          </>
        }
      />
    </main>
  );
}
