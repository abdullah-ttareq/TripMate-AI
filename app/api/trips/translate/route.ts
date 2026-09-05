import { NextResponse } from "next/server";
import { z } from "zod";

import { RateLimitError } from "@/lib/ai";
import { isLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { translateStrings } from "@/lib/translate";

/**
 * POST /api/trips/translate
 *
 * Translates one chunk of an itinerary's text. The browser sends the chunks
 * one at a time rather than the whole trip at once, because Groq's free tier
 * caps a minute's tokens across the entire project and a long itinerary does
 * not fit in a single request.
 *
 * A rate limit is answered with 429 and a flag the client uses to stop sending
 * further chunks. Continuing would spend the rest of the minute's budget on
 * requests that are already certain to fail.
 */

const requestSchema = z.object({
  items: z.array(z.string().max(600)).min(1).max(40),
  target: z.string().refine(isLocale, "Unsupported language"),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Translation spends the project's AI budget, so it is not open to
  // anonymous callers.
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

  try {
    const items = await translateStrings(parsed.data.items, parsed.data.target);

    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, rateLimited: true },
        { status: 429 },
      );
    }

    console.error("Translation failed.", error);

    return NextResponse.json({ error: "Could not translate this trip." }, { status: 502 });
  }
}
