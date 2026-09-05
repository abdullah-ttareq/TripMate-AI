import Groq from "groq-sdk";

import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { tripPlanJsonSchema, tripPlanSchema } from "@/lib/schema";
import type { TripInput, TripPlan } from "@/lib/schema";

/**
 * gpt-oss-120b is the model on Groq that supports strict structured outputs,
 * which is what guarantees the response matches our schema. Other Groq models
 * only offer loose JSON mode, which would put us back to hand-cleaning text.
 */
const MODEL = "openai/gpt-oss-120b";

/**
 * Groq's free tier allows 8,000 tokens per minute, and it counts the prompt
 * plus max_completion_tokens against that ceiling — so asking for a large
 * output budget gets the request rejected outright, even when the reply would
 * have been short. Ask for what the trip actually needs.
 *
 * Roughly 280 tokens per day of itinerary, plus room for the model's reasoning.
 * Each activity became an object with a `place` field for grounding, which
 * costs both the name and the JSON structure around it — hence 280 rather than
 * the 220 that sufficed when an activity was a bare string.
 */
function tokenBudget(days: number): number {
  return Math.min(6800, 1500 + days * 280);
}

/** An error safe to show the user. The real cause is logged server-side. */
export class AiError extends Error {}

/** Retrying inside the same minute cannot succeed, so this one is not retried. */
export class RateLimitError extends AiError {}

const SYSTEM_PROMPT = `You are a travel planner. You receive trip details as JSON and produce a day-by-day itinerary.

Rules:

1. Produce exactly the number of days requested. Not more, not fewer.
2. All money is in Saudi Riyals (SAR). Use whole numbers.
3. Name real, specific places: actual neighbourhoods, landmarks, restaurants, and museums in the destination. Never write generic filler like "a local restaurant" or "explore the city centre".
4. Give each day exactly 3 to 4 activities. Each activity is an object with two fields:
   - "text": what the traveller does, under 12 words — a place and what you do there, nothing more. Write "Hegra guided tour (200 SAR)", not a paragraph explaining the site.
   - "place": the bare searchable name of the real place, with no description, no cost, and no extra words. For the example above that is "Hegra". Use null when the activity is not at one specific named place — checking in, travelling, or a free evening.
5. Keep each day's description to one short sentence. The activity list carries the detail.
6. estimatedBudget is the total trip cost: flights, accommodation, and the sum of every day's estimatedCost.
7. Be honest about budget. If the requested budget cannot realistically cover this trip, set budgetWarning to a short explanation naming a realistic minimum figure, and still plan the best trip possible at the stated budget. Never lower your cost estimates to make the trip appear affordable. If the budget is workable, set budgetWarning to null.
8. Account for arrival and departure. Day 1 includes travel and check-in; the final day includes checkout and the return journey.
9. Keep each day geographically sensible. Group activities that are near each other rather than crossing the city repeatedly.
10. Give exactly 3 travelTips, one sentence each, specific to this destination and season rather than generic travel advice.
11. Titles are short — 5 words at most, no trailing punctuation.
12. Write every numeric field as a JSON number, never as a quoted string.
13. Always write "place" in English using Latin script, even when the rest of the itinerary is in Arabic. It is a lookup key for a map database, not text the reader sees.`;

/**
 * Appended so the itinerary is written in the reader's language.
 *
 * Note this deliberately does not cover "place", which rule 13 pins to English
 * regardless of locale: the field is a search key for the places provider,
 * which resolves Latin-script names far more reliably. What the reader
 * actually sees is the provider's own localised name for the place.
 */
const LANGUAGE_RULE: Record<Locale, string> = {
  en: "\n14. Write every other string in English.",
  ar: "\n14. اكتب باقي النصوص بالعربية الفصحى المبسطة. أسماء الأماكن داخل \"text\" بالعربية إن كان لها اسم عربي متداول، وإلا فبالحروف اللاتينية. الأرقام بالأرقام الإنجليزية (1, 2, 3). أما حقل \"place\" فبالإنجليزية دائماً كما تنص القاعدة 13.",
};

/**
 * Asks the model for an itinerary and returns it already validated.
 * Throws AiError with a message that is safe to show the user.
 */
export async function generateTripPlan(
  input: TripInput,
  locale: Locale = DEFAULT_LOCALE,
): Promise<TripPlan> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is not set.");
    throw new AiError("The trip planner is not configured yet.");
  }

  const groq = new Groq({ apiKey });

  // Strict mode makes malformed JSON very unlikely, but the model can still
  // return the wrong number of days. One retry covers that.
  for (let attempt = 1; attempt <= 2; attempt++) {
    // A rate-limit failure propagates instead of burning the second attempt:
    // the limit is per minute, so an immediate retry cannot succeed.
    const raw = await requestPlan(groq, input, locale);
    const parsed = tripPlanSchema.safeParse(raw);

    if (!parsed.success) {
      console.error(`Attempt ${attempt}: response did not match schema.`, parsed.error);
      continue;
    }

    const problem = itineraryProblem(parsed.data, input.days);

    if (!problem) return parsed.data;

    console.error(`Attempt ${attempt}: ${problem}.`);

    // A wrong number of days cannot be repaired — there is no way to invent or
    // discard a day's content — so that always costs a retry.
    if (parsed.data.itinerary.length !== input.days) continue;

    // The right days in the right order, merely mislabelled. Worth one retry
    // for a clean answer, but on the last attempt renumbering is better than
    // failing: the labels are cosmetic and the itinerary itself is sound.
    if (attempt === 2) return renumberDays(parsed.data);
  }

  throw new AiError("Could not build a usable itinerary. Please try again.");
}

/**
 * Describes what is wrong with a generated itinerary's days, or null if it is
 * sound.
 *
 * Strict structured output guarantees the shape but says nothing about the
 * values, and on longer trips the model does repeat itself — a 20-day request
 * came back containing two days numbered 9. That produced duplicate React keys
 * and, worse, an itinerary that silently skipped a day.
 */
function itineraryProblem(plan: TripPlan, days: number): string | null {
  if (plan.itinerary.length !== days) {
    return `asked for ${days} days, got ${plan.itinerary.length}`;
  }

  const numbers = plan.itinerary.map((day) => day.day);

  if (new Set(numbers).size !== numbers.length) {
    return `duplicate day numbers: ${numbers.join(", ")}`;
  }

  const outOfOrder = numbers.findIndex((value, index) => value !== index + 1);

  if (outOfOrder !== -1) {
    return `day numbers are not 1..${days} in order: ${numbers.join(", ")}`;
  }

  return null;
}

/** Relabels days 1..N, keeping the order the model produced. */
function renumberDays(plan: TripPlan): TripPlan {
  return {
    ...plan,
    itinerary: plan.itinerary.map((day, index) => ({ ...day, day: index + 1 })),
  };
}

/**
 * Whether Groq rejected the model's own output as unparseable JSON.
 *
 * This arrives as a 400 carrying `code: "json_validate_failed"` and the broken
 * text in `failed_generation`, which is a different thing from the request
 * being wrong: the same input usually succeeds on the next attempt.
 */
function isMalformedGeneration(error: unknown): boolean {
  if (!(error instanceof Groq.APIError) || error.status !== 400) return false;

  const body = (error as { error?: { error?: { code?: unknown } } }).error;

  return body?.error?.code === "json_validate_failed";
}

async function requestPlan(
  groq: Groq,
  input: TripInput,
  locale: Locale,
): Promise<unknown> {
  let completion;

  try {
    completion = await groq.chat.completions.create({
      model: MODEL,
      max_completion_tokens: tokenBudget(input.days),
      // Low effort keeps reasoning tokens down, which matters because they
      // share the same per-minute budget as the itinerary itself.
      reasoning_effort: "low",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + LANGUAGE_RULE[locale] },
        { role: "user", content: JSON.stringify(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "trip_plan",
          strict: true,
          schema: tripPlanJsonSchema(),
        },
      },
    });
  } catch (error) {
    // Groq reports a per-minute token limit as 413, not only as 429.
    if (error instanceof Groq.APIError && (error.status === 429 || error.status === 413)) {
      console.error("Groq request failed.", error);

      throw new RateLimitError(
        "The trip planner has hit its usage limit for this minute. Please wait a moment and try again.",
      );
    }

    // Strict structured output is checked *after* the model has written its
    // answer, so a reply whose JSON does not parse comes back as a 400 rather
    // than as a completion. Observed repeatedly on Arabic itineraries, where
    // the model drops the opening quote of a string:
    //
    //     "title": رحلة البسفور",
    //
    // That is a bad generation, not a failure to reach the provider, and the
    // retry in generateTripPlan is exactly the right answer to it. Returning
    // null routes it into that loop; throwing here escaped the loop entirely
    // and turned one unusable sample into a hard failure.
    if (isMalformedGeneration(error)) {
      console.error(
        `Groq rejected its own output as invalid JSON (json_validate_failed) for ${input.days} days in ${locale}. Retrying if attempts remain.`,
      );

      return null;
    }

    console.error("Groq request failed.", error);

    throw new AiError("Could not reach the trip planner. Please try again.");
  }

  const choice = completion.choices[0];

  if (choice?.finish_reason === "length") {
    console.error("Response hit the token limit.");
    throw new AiError("That trip was too long to plan. Try fewer days.");
  }

  const content = choice?.message?.content;

  if (!content) {
    console.error("Groq returned an empty response.");
    throw new AiError("The trip planner returned nothing. Please try again.");
  }

  try {
    return JSON.parse(content);
  } catch {
    console.error("Groq returned content that was not JSON.");
    return null;
  }
}
