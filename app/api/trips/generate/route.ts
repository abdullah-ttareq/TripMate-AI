import { NextResponse } from "next/server";

import { AiError, generateTripPlan } from "@/lib/ai";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { fieldErrors, tripInputSchema } from "@/lib/schema";

/**
 * POST /api/trips/generate
 *
 * Validates the trip details and returns a generated itinerary.
 * Runs on the server so the AI provider key is never sent to the browser.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Could not read the request." },
      { status: 400 },
    );
  }

  // The same schema the form uses. Client validation is for feedback;
  // this one is the actual gate.
  const parsed = tripInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check your trip details.",
        fields: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  // Sent alongside the trip details; anything unrecognised falls back rather
  // than failing the request.
  const requested = (body as { locale?: unknown })?.locale;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  try {
    const plan = await generateTripPlan(parsed.data, locale);

    return NextResponse.json({ input: parsed.data, plan });
  } catch (error) {
    // AiError messages are written for the user; anything else is unexpected
    // and must not leak provider details to the browser.
    if (error instanceof AiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("Unexpected failure while generating a trip.", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
