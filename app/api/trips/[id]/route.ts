import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/trips/[id] — one saved trip, in the same shape the Result page
 * uses for a freshly generated one.
 *
 * Row Level Security means another user's id simply returns nothing, so there
 * is no ownership check to write here.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  // `select()` makes Postgres report which rows it actually removed. Without
  // it a delete that matched nothing — someone else's trip, blocked by Row
  // Level Security — would look identical to a successful one.
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("Could not delete the trip.", error);
    return NextResponse.json({ error: "Could not delete this trip." }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: id });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Could not load the trip.", error);
    return NextResponse.json({ error: "Could not load this trip." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  return NextResponse.json({
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
}
