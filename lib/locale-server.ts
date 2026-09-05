import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

/**
 * The chosen language, read on the server so the first HTML response is
 * already in the right language and direction — no flash of English.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;

  return isLocale(value) ? value : DEFAULT_LOCALE;
}
