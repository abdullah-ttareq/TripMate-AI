import type { Locale } from "@/lib/i18n";
import type { TripPlan } from "@/lib/schema";

/**
 * Pulling the translatable text out of a plan and putting it back.
 *
 * Switching language used to leave a trip half-translated: the navigation and
 * labels turned English while the itinerary the model wrote stayed Arabic.
 * Regenerating the trip would have fixed the language and changed the plan,
 * which is worse — the user asked to read the same trip, not to be given a
 * different one. So the structure is kept and only its text is translated.
 *
 * `planStrings` and `withStrings` are exact inverses and must stay that way:
 * the translated text comes back as a flat array matched purely by position,
 * so any change to what one visits has to be mirrored in the other.
 *
 * What is deliberately *not* included:
 *
 * - `place`, which is a lookup key for the geocoder and is pinned to English
 * - every number: costs, day numbers, the budget, coordinates
 * - the destination, which is echoed from the user's own input
 */

/** Text fields of a plan, in a fixed order. */
export function planStrings(plan: TripPlan): string[] {
  const strings = [plan.title];

  if (plan.budgetWarning) strings.push(plan.budgetWarning);

  for (const day of plan.itinerary) {
    strings.push(day.title, day.description);

    for (const activity of day.activities) {
      strings.push(activity.text);
    }
  }

  strings.push(...plan.travelTips);

  return strings;
}

/**
 * Rebuilds a plan from translated text, in the order `planStrings` produced.
 *
 * A string that could not be translated arrives as its original, so a partly
 * failed translation degrades to partly translated text rather than to gaps.
 */
export function withStrings(plan: TripPlan, strings: string[]): TripPlan {
  let index = 0;
  const next = () => strings[index++] ?? "";

  const title = next();
  const budgetWarning = plan.budgetWarning ? next() : null;

  const itinerary = plan.itinerary.map((day) => ({
    ...day,
    title: next(),
    description: next(),
    activities: day.activities.map((activity) => ({
      ...activity,
      text: next(),
    })),
  }));

  const travelTips = plan.travelTips.map(() => next());

  return { ...plan, title, budgetWarning, itinerary, travelTips };
}

/**
 * Which language a plan's text is written in.
 *
 * Detected from the text rather than stored alongside it, which avoids adding
 * a column and a migration for something one regular expression can answer.
 * Arabic and Latin scripts do not overlap, so this is unambiguous for the two
 * languages this app generates. It would need revisiting if a third language
 * using Latin script were ever added.
 */
export function planLocale(plan: TripPlan): Locale {
  const sample = [plan.title, ...plan.itinerary.map((day) => day.title)].join(" ");

  return /[؀-ۿ]/.test(sample) ? "ar" : "en";
}
