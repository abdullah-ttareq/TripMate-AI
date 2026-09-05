import { z } from "zod";

/**
 * Today's date as YYYY-MM-DD in the user's local timezone.
 * Comparing date strings avoids the timezone bugs you get from comparing
 * Date objects: `new Date("2026-08-16")` is UTC midnight, which is a
 * different instant than local midnight.
 */
function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Sign-up and sign-in credentials. */
export const credentialsSchema = z.object({
  email: z.email({ error: "Enter a valid email address" }),

  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(72, { error: "Password must be 72 characters or fewer" }),
});

export type Credentials = z.infer<typeof credentialsSchema>;

/** What the user submits from the Plan form. */
export const tripInputSchema = z
  .object({
    from: z
      .string()
      .trim()
      .min(2, { error: "Enter where you are travelling from" })
      .max(60, { error: "Keep this under 60 characters" }),

    destination: z
      .string()
      .trim()
      .min(2, { error: "Enter your destination" })
      .max(60, { error: "Keep this under 60 characters" }),

    departureDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choose a departure date" })
      .refine((value) => value >= todayISO(), {
        error: "Departure date cannot be in the past",
      }),

    budget: z
      .number({ error: "Enter your budget" })
      .int({ error: "Budget must be a whole number" })
      .min(500, { error: "Budget must be at least 500 SAR" })
      .max(500000, { error: "Budget must be 500,000 SAR or less" }),

    days: z
      .number({ error: "Enter the number of days" })
      .int({ error: "Days must be a whole number" })
      .min(1, { error: "Trip must be at least 1 day" })
      .max(30, { error: "Trip must be 30 days or less" }),
  })
  .refine(
    (input) => input.from.toLowerCase() !== input.destination.toLowerCase(),
    {
      error: "Destination must be different from where you are travelling from",
      path: ["destination"],
    },
  );

export type TripInput = z.infer<typeof tripInputSchema>;

/**
 * A number the model may write as either 5 or "5".
 *
 * Groq's "strict" structured output validates the response *after* generating
 * it rather than constraining decoding, so a stray quoted number makes it
 * reject the whole reply. Accepting both forms and converting to a number here
 * turns a hard failure into a non-event.
 */
const numberish = z.union([z.number(), z.string()]).transform(Number);

/**
 * One activity within a day.
 *
 * `text` is what the reader sees. `place` is the bare searchable name of the
 * real-world place it happens at — "Hegra", never "Hegra guided tour (200
 * SAR)" — or null when the activity is not tied to a named place, such as
 * checking in or travelling. Place grounding looks up `place`; it never tries
 * to parse a place out of `text`.
 */
export const activitySchema = z.strictObject({
  text: z.string(),
  place: z.string().nullable(),
});

export type Activity = z.infer<typeof activitySchema>;

/**
 * An activity as it may actually arrive, which is not always the shape above.
 *
 * Two sources still produce a bare string. Trips saved before place grounding
 * existed hold `string[]` in their `itinerary` jsonb and must keep rendering.
 * And Groq validates strict output *after* generating it, so a model that
 * ignored the object shape would fail the whole request rather than simply
 * going unenriched — the same reasoning that makes `numberish` above accept
 * two forms.
 *
 * Both branches normalise to `Activity`, so the UI only ever sees one shape.
 */
const readableActivity = z.union([
  z.string().transform((text): Activity => ({ text, place: null })),
  activitySchema,
]);

/**
 * One day of the generated itinerary.
 *
 * `strictObject` rather than `object` because Groq's strict structured-output
 * mode requires `additionalProperties: false` on every object in the schema.
 */
export const daySchema = z.strictObject({
  day: numberish,
  title: z.string(),
  description: z.string(),
  activities: z.array(readableActivity),
  estimatedCost: numberish,
});

export type Day = z.infer<typeof daySchema>;

/**
 * What the AI returns. `budgetWarning` lets the model say "this budget is not
 * realistic" instead of inventing prices to appear within budget.
 */
export const tripPlanSchema = z.strictObject({
  title: z.string(),
  destination: z.string(),
  days: numberish,
  estimatedBudget: numberish,
  budgetWarning: z.string().nullable(),
  itinerary: z.array(daySchema),
  travelTips: z.array(z.string()),
});

export type TripPlan = z.infer<typeof tripPlanSchema>;

/**
 * The same trip-plan shape as plain JSON Schema, for the AI request.
 * One definition drives both the request constraint and the response check,
 * so they cannot drift apart.
 */
export function tripPlanJsonSchema(): Record<string, unknown> {
  // "input" renders the shape the model should send, before our conversions —
  // so numeric fields appear as number-or-string, matching what we accept.
  const json = z.toJSONSchema(tripPlanSchema, {
    io: "input",
  }) as Record<string, unknown>;

  // Groq rejects the $schema key inside a json_schema request.
  delete json.$schema;

  return json;
}

/** A generated plan plus the input it came from, as stored and displayed. */
export const generatedTripSchema = z.object({
  input: tripInputSchema,
  plan: tripPlanSchema,
});

export type GeneratedTrip = z.infer<typeof generatedTripSchema>;

/**
 * Turns a Zod error into a { field: message } map the form can render.
 * Only the first error per field is kept — showing three messages under one
 * input is noise.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}
