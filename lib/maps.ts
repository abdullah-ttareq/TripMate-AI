/**
 * Google Maps links for resolved places.
 *
 * These are plain URLs against Google's documented `api=1` link format. No
 * Google API is called, no key exists, and nothing here requires a billing
 * account — which is the whole reason the project can link to Google Maps
 * while deliberately not using Google Places.
 */

/**
 * A link that opens the place in Google Maps.
 *
 * The query is the resolved coordinates rather than the place name. A name is
 * a search, and a search can land on a similarly-named place in another
 * country; a coordinate pair is unambiguous and drops the pin exactly where
 * the geocoder put it. The name would only be used here if a Google Place ID
 * were available to pin it down, and obtaining one requires the paid Places
 * API this project does not use.
 */
export function googleMapsUrl(place: { lat: number; lon: number }): string {
  const query = encodeURIComponent(`${place.lat},${place.lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
