import { browserStorage, readStored, writeStored } from "@/lib/local-store";
import { generatedTripSchema } from "@/lib/schema";
import type { GeneratedTrip } from "@/lib/schema";

/**
 * The freshly generated trip is handed from /plan to /result through
 * sessionStorage. It is a transport between two pages, not a database —
 * saved trips live in Supabase (Phase 5).
 */
const KEY = "tripmate:lastTrip";

export function saveLastTrip(trip: GeneratedTrip): void {
  writeStored(browserStorage("session"), KEY, JSON.stringify(trip));
}

/**
 * The stored trip as its raw string, or null.
 *
 * Raw rather than parsed so it can serve as a `useSyncExternalStore` snapshot,
 * which is compared by identity — a freshly parsed object would look like a
 * change on every render. See lib/local-store.ts.
 */
export function readLastTripRaw(): string | null {
  return readStored(browserStorage("session"), KEY);
}

/** Returns null if nothing is stored, or if what is stored is unreadable. */
export function parseLastTrip(raw: string | null): GeneratedTrip | null {
  if (!raw) return null;

  try {
    const parsed = generatedTripSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
