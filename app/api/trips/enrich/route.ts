import { NextResponse } from "next/server";
import { z } from "zod";

import { countryFactsFor } from "@/lib/data/country-facts";
import { resolveTripPlaces } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/trips/enrich
 *
 * Takes the place names an itinerary mentions and returns what could be
 * verified about them. Runs on the server so the places provider's key stays
 * out of the browser.
 *
 * This is a separate route rather than part of trip generation on purpose. The
 * itinerary renders as soon as it is generated and enrichment fills in
 * afterwards, which keeps the slowest optional step off the critical path and
 * means a saved trip gets enriched on view just like a fresh one.
 *
 * Every failure here is answered with an empty result, never an error status:
 * the caller treats "nothing resolved" and "provider is down" identically, and
 * in both cases the itinerary is already on screen.
 */

const requestSchema = z.object({
  destination: z.string().trim().min(1).max(120),
  places: z.array(z.string().trim().min(1).max(160)).max(200),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Enrichment spends a third-party quota, so it is not open to anonymous
  // callers. Every page that uses it already requires a session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  // No locale is taken here. Place lookup is always performed in English
  // because the provider's language parameter changes which place is returned,
  // not just how it is spelled — see the note in `lib/places.ts`.
  try {
    const { places, countryCode } = await resolveTripPlaces(
      parsed.data.places,
      parsed.data.destination,
    );

    // The country the geocoder identified is what selects the useful-apps and
    // local-essentials content, so both travel back in the same response
    // rather than costing the browser a second round trip. The lookup is a
    // curated table, so it costs nothing and cannot fail.
    return NextResponse.json({
      places,
      destination: countryFactsFor(countryCode),
    });
  } catch (error) {
    // Enrichment is an enhancement. If it breaks, the trip is still fine, so
    // this reports "nothing found" rather than failing the request.
    console.error("Place enrichment failed.", error);
    return NextResponse.json({ places: {}, destination: null });
  }
}
