import { distanceKm } from "@/lib/geo";
import { findPlacePhoto } from "@/lib/wikimedia";
import type { PlacePhoto } from "@/lib/wikimedia";

/**
 * Place grounding.
 *
 * The AI names places; it is not trusted to know where they are or whether
 * they exist. This module takes the names it produced and resolves them
 * against Geoapify, a real geocoding service, keeping only matches that sit in
 * the right country, close enough to the destination, and are not merely the
 * destination itself.
 *
 * Everything here is optional enrichment. Every failure path returns "not
 * resolved" rather than throwing, because the itinerary has to render whether
 * or not this succeeds.
 *
 * Geoapify was chosen over Google Places because Google Maps Platform requires
 * a billing account with a card on file, which this project deliberately
 * avoids. Provider-specific code is confined to `lookUp` below, so swapping
 * providers later is one function, not a refactor.
 */

export type ResolvedPlace = {
  /** The provider's own id, used only as a stable React key. */
  id: string;
  /**
   * The provider's official name. Always English — see the `lang` note in
   * `lookUp`, where asking for another language changes which place comes back.
   */
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  photo: PlacePhoto | null;
};

const GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";

/**
 * How far from the destination centre a match may sit before we assume the
 * geocoder found a same-named place somewhere else entirely.
 *
 * 250km is wide enough for a trip that ranges around a region — AlUla to
 * Khaybar, say — and narrow enough to reject "Hegra" resolving to a street in
 * another country, which is the failure this gate exists to catch.
 */
const MAX_DISTANCE_KM = 250;

/**
 * Note there is deliberately no confidence threshold here.
 *
 * Geoapify reports a `confidence` score, and it is tempting to gate on it, but
 * it measures how closely the result's *name* resembles the query string — not
 * whether the result is the right place. Searching "Hegra" inside Saudi Arabia
 * returns "Al-Hijr Archaeological Site (Madâin Sâlih)", which is exactly
 * right, at confidence 0; searching it with no country filter returns Hegra,
 * Norway at confidence 1. A threshold would have rejected the correct answer
 * and trusted the wrong one.
 *
 * Correctness is therefore established geographically instead: the country
 * filter on the request, the distance check above, and the destination check
 * below. A name that matches nothing at all returns no result, which needs no
 * threshold to reject.
 */

/** Geoapify's free tier allows 5 requests a second; stay well under it. */
const CONCURRENCY = 3;

/** Bounds how much of the daily quota one trip can spend. */
const MAX_PLACES_PER_TRIP = 60;

/**
 * Resolved places, keyed by `${destination}|${place}`.
 *
 * Enrichment is recomputed every time a trip is viewed rather than stored in
 * the database, so without a cache a popular trip would re-query the provider
 * on every page load. Module scope means the cache lives as long as the server
 * process, which is the right lifetime for data that effectively never changes.
 */
const cache = new Map<string, ResolvedPlace | null>();

/** Keeps the cache from growing without bound on a long-running server. */
const MAX_CACHE_ENTRIES = 1000;

type DestinationContext = {
  name: string;
  lat: number;
  lon: number;
  countryCode: string | null;
};

type GeoapifyResult = {
  place_id?: string;
  name?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  lat?: number;
  lon?: number;
  country_code?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  rank?: { confidence?: number };
};

/**
 * Resolves every named place in one trip.
 *
 * Returns a map keyed by the exact place string the AI produced, so the caller
 * can look each activity up by the value already in its `place` field. Names
 * that did not resolve are simply absent from the map.
 */
export async function resolveTripPlaces(
  places: string[],
  destination: string,
): Promise<{ places: Record<string, ResolvedPlace>; countryCode: string | null }> {
  if (!process.env.GEOAPIFY_API_KEY) {
    console.error("GEOAPIFY_API_KEY is not set; skipping place enrichment.");
    return { places: {}, countryCode: null };
  }

  const unique = [...new Set(places.map((p) => p.trim()).filter(Boolean))].slice(
    0,
    MAX_PLACES_PER_TRIP,
  );

  // One lookup for the destination itself, so every place afterwards can be
  // biased toward it and checked against it. Without this the geocoder has no
  // idea which "Victoria Street" you meant.
  //
  // It runs even when there are no places to resolve, because its country code
  // is what drives the useful-apps and local-essentials sections.
  const context = await resolveDestination(destination);
  const countryCode = context?.countryCode ?? null;

  if (unique.length === 0) return { places: {}, countryCode };

  const resolved: Record<string, ResolvedPlace> = {};

  await mapWithLimit(unique, CONCURRENCY, async (place) => {
    const match = await resolvePlace(place, destination, context);
    if (match) resolved[place] = match;
  });

  return { places: resolved, countryCode };
}

/** Geocodes the destination itself to get a centre point and a country. */
async function resolveDestination(
  destination: string,
): Promise<DestinationContext | null> {
  const result = await lookUp(destination, {});

  if (!result || result.lat === undefined || result.lon === undefined) {
    return null;
  }

  return {
    name: result.name?.trim() || destination,
    lat: result.lat,
    lon: result.lon,
    countryCode: result.country_code ?? null,
  };
}

async function resolvePlace(
  place: string,
  destination: string,
  context: DestinationContext | null,
): Promise<ResolvedPlace | null> {
  const key = `${destination}|${place}`.toLowerCase();

  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const match = await lookUpAndVerify(place, destination, context);

  // Failures are cached too. A name the provider does not know will not start
  // being known within the life of this process, and re-asking wastes quota.
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(key, match);

  return match;
}

async function lookUpAndVerify(
  place: string,
  destination: string,
  context: DestinationContext | null,
): Promise<ResolvedPlace | null> {
  // Naming the destination in the query matters when there is no context to
  // bias toward — it is the only signal the geocoder gets about which city.
  const query = context ? place : `${place}, ${destination}`;

  const result = await lookUp(query, {
    bias: context ? `proximity:${context.lon},${context.lat}` : undefined,
    countryCode: context?.countryCode ?? undefined,
  });

  if (!result || result.lat === undefined || result.lon === undefined) {
    return null;
  }

  const name = result.name?.trim() || result.address_line1?.trim() || place;

  // The country filter on the request already excludes most wrong matches, but
  // it cannot catch a same-named place at the other end of the same country.
  if (context) {
    const km = distanceKm(context.lat, context.lon, result.lat, result.lon);
    if (km > MAX_DISTANCE_KM) return null;

    // When the geocoder cannot find a landmark it falls back to the city that
    // was searched: "AlUla Old Town" comes back as plain "AlUla". That is not
    // the place the itinerary meant, and pinning a map marker and a photograph
    // on the whole city would be the broader-entity mistake in a new form.
    if (isSameName(name, context.name) || isSameName(name, destination)) {
      return null;
    }
  }

  // Both names go to the photo lookup: the geocoder's official name and the
  // one the itinerary used. They frequently differ, and an encyclopedia
  // article may be titled like either.
  //
  // City and country go with them. They are what vouches for an article that
  // carries no coordinates of its own — a restaurant or a building — where
  // proximity cannot be measured.
  //
  // A photo is a further optional step on top of an optional step: if it
  // fails, the place still resolves and still gets an address and a map link.
  const photo = await findPlacePhoto({
    names: [name, place],
    lat: result.lat,
    lon: result.lon,
    city: result.city ?? result.county ?? result.state ?? null,
    country: result.country ?? null,
  });

  return {
    id: result.place_id ?? `${result.lat},${result.lon}`,
    name,
    address: addressOf(result),
    lat: result.lat,
    lon: result.lon,
    photo,
  };
}

/**
 * The single point where this project talks to Geoapify. Returns the top
 * result, or null for any failure at all — a missing key, a network fault, a
 * rate limit, a malformed body. Callers treat all of those the same way.
 */
async function lookUp(
  text: string,
  options: { bias?: string; countryCode?: string },
): Promise<GeoapifyResult | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return null;

  const url = new URL(GEOCODE_URL);
  url.searchParams.set("text", text);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  // Always English, never the reader's language.
  //
  // Geoapify's `lang` does not merely translate the reply — it changes which
  // result comes back. Searching "Tokyo Skytree" with lang=en returns Tokyo
  // Skytree; the identical search with lang=ar returns *Hilton Tokyo*. Passing
  // the UI language through would therefore have shown Arabic readers a
  // different place than English readers, which is the exact failure this
  // module exists to prevent.
  //
  // The cost is that a resolved place is labelled with its English name in the
  // Arabic interface. That is the right trade: the activity text around it is
  // still Arabic, and an English label matches what the reader will see when
  // they follow the link into Google Maps.
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", apiKey);

  if (options.bias) url.searchParams.set("bias", options.bias);

  if (options.countryCode) {
    url.searchParams.set("filter", `countrycode:${options.countryCode}`);
  }

  try {
    const response = await fetch(url, {
      // A slow provider must not hold up the itinerary behind it.
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      console.error(`Geoapify returned ${response.status}.`);
      return null;
    }

    const body = (await response.json()) as { results?: GeoapifyResult[] };

    return body.results?.[0] ?? null;
  } catch (error) {
    console.error("Geoapify lookup failed.", error);
    return null;
  }
}

/**
 * Whether two place names refer to the same thing, ignoring case, spacing,
 * punctuation and accents — so "Al-'Ula", "AlUla" and "al ula" all agree.
 */
function isSameName(a: string, b: string): boolean {
  const clean = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ]/g, "");

  const left = clean(a);

  return left.length > 0 && left === clean(b);
}

/** The readable part of the address, without repeating the place name. */
function addressOf(result: GeoapifyResult): string | null {
  const line = result.address_line2?.trim() || result.formatted?.trim();
  return line ? line : null;
}

/**
 * Runs `task` over every item with at most `limit` in flight at once.
 *
 * Resolving twenty places one at a time is needlessly slow, and resolving them
 * all at once trips the provider's rate limit. This is the middle.
 */
async function mapWithLimit<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const item = items[cursor++];
      await task(item);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);

  await Promise.all(workers);
}
