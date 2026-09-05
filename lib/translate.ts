import Groq from "groq-sdk";
import { z } from "zod";

import { AiError, RateLimitError } from "@/lib/ai";
import type { Locale } from "@/lib/i18n";

/**
 * Translating an already-generated itinerary between English and Arabic.
 *
 * This exists instead of regenerating the trip in the other language. A second
 * generation would cost as much as the first and would return a *different*
 * itinerary, which is not what someone flipping the language switch is asking
 * for.
 *
 * The hard constraint is Groq's free tier: 8,000 tokens a minute across the
 * whole project, counting the prompt plus the requested output ceiling
 * together. A twenty-day itinerary is well over a hundred separate strings, so
 * it cannot be translated in one request. The caller sends it in chunks and
 * this module keeps each one small enough that several fit inside a minute.
 */

const MODEL = "openai/gpt-oss-120b";

/**
 * Strings per request.
 *
 * Twenty short strings is roughly 300 tokens in and 400 out. With the ceiling
 * below that is about 1,300 tokens against the minute's budget per chunk, so a
 * long itinerary spends five or six chunks and still leaves room for the
 * generation that produced it.
 */
export const CHUNK_SIZE = 20;

const MAX_OUTPUT_TOKENS = 900;

/** Caps one request regardless of what the caller asks for. */
const MAX_ITEMS = 40;

const responseSchema = z.strictObject({
  items: z.array(z.string()),
});

const LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  ar: "Arabic",
};

const SYSTEM_PROMPT = `You translate travel itinerary text.

You receive a JSON array of strings and return the same number of strings, in the same order, translated into the target language.

Rules:

1. Return exactly as many strings as you received. Never merge, split, add or drop an entry.
2. Translate the meaning, not word for word. The result must read naturally to a traveller.
3. Keep proper names of places recognisable. Use the established local form when there is one; otherwise leave the name as it is. Never invent a translation for a place name.
4. Leave every number exactly as it is: costs, distances, times, and the digits themselves. Write numbers with the digits 0-9.
5. Keep any currency code such as SAR unchanged.
6. Preserve the tone and the length. These are short itinerary lines, not paragraphs.
7. If a string is already in the target language, return it unchanged.`;

/**
 * Translates a batch of strings.
 *
 * Returns the originals rather than throwing when the model answers with the
 * wrong number of strings: a mismatched batch cannot be mapped back onto the
 * itinerary safely, and showing the untranslated original is better than
 * showing text against the wrong activity.
 */
export async function translateStrings(
  items: string[],
  target: Locale,
): Promise<string[]> {
  if (items.length === 0) return [];

  if (items.length > MAX_ITEMS) {
    throw new AiError("Too many items in one translation request.");
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is not set.");
    throw new AiError("Translation is not configured.");
  }

  const groq = new Groq({ apiKey });

  let completion;

  try {
    completion = await groq.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nTarget language: ${LANGUAGE_NAME[target]}.`,
        },
        { role: "user", content: JSON.stringify(items) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "translation",
          strict: true,
          schema: {
            type: "object",
            properties: { items: { type: "array", items: { type: "string" } } },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    });
  } catch (error) {
    console.error("Translation request failed.", error);

    // Same as generation: Groq reports the per-minute token limit as 413 as
    // well as 429, and the caller needs to tell the two apart from a genuine
    // failure so it can stop rather than keep spending the budget.
    if (error instanceof Groq.APIError && (error.status === 429 || error.status === 413)) {
      throw new RateLimitError("Translation hit its usage limit for this minute.");
    }

    throw new AiError("Could not reach the translator.");
  }

  const choice = completion.choices[0];

  if (choice?.finish_reason === "length") {
    console.error("Translation hit the token limit.");
    return items;
  }

  const content = choice?.message?.content;
  if (!content) return items;

  try {
    const parsed = responseSchema.safeParse(JSON.parse(content));

    if (!parsed.success) return items;

    // Position is the only thing tying a translation back to its original, so
    // a different length makes the whole batch unusable.
    if (parsed.data.items.length !== items.length) {
      console.error(
        `Translation returned ${parsed.data.items.length} strings for ${items.length}.`,
      );
      return items;
    }

    // An empty string would blank a line in the itinerary; keep the original.
    return parsed.data.items.map((value, index) => value.trim() || items[index]);
  } catch {
    console.error("Translation returned content that was not JSON.");
    return items;
  }
}
