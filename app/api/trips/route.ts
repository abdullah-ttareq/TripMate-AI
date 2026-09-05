import { NextResponse } from "next/server";

import { generatedTripSchema } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

/** POST /api/trips — save a generated trip for the signed-in user. */
export async function POST(request: Request) {
  const supabase = await createClient();

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

  const parsed = generatedTripSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "That trip could not be saved." }, { status: 400 });
  }

  const { input, plan } = parsed.data;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      // Row Level Security also enforces this, but setting it here means the
      // right value is written rather than relying on the policy to reject.
      user_id: user.id,
      title: plan.title,
      from_location: input.from,
      destination: plan.destination,
      departure_date: input.departureDate,
      budget: input.budget,
      estimated_budget: plan.estimatedBudget,
      days: plan.days,
      itinerary: plan.itinerary,
      travel_tips: plan.travelTips,
      budget_warning: plan.budgetWarning,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Could not save the trip.", error);
    return NextResponse.json({ error: "Could not save the trip." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

/** GET /api/trips — list the signed-in user's saved trips, newest first. */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, days, estimated_budget, departure_date, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load trips.", error);
    return NextResponse.json({ error: "Could not load your trips." }, { status: 500 });
  }

  return NextResponse.json({ trips: data });
}
