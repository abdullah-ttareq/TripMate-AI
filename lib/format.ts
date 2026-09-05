import type { Locale } from "@/lib/i18n";

/**
 * Locale-aware formatting for every number and date the UI shows.
 *
 * Two decisions worth knowing before changing anything here.
 *
 * **Arabic uses Latin digits.** The obvious `ar` locale renders Arabic-Indic
 * numerals (٤٬٨٥٠), but the itinerary's own numbers come from the model, which
 * is instructed to write 1, 2, 3. Mixing the two in one page looks like a bug.
 * `ar-u-nu-latn` keeps Arabic grouping and separators with Latin digits, so
 * everything on the page agrees.
 *
 * **Dates are formatted in UTC.** A departure date is a plain calendar date
 * like "2026-10-10" with no time attached. Parsing it without forcing a zone
 * makes the browser read it as UTC midnight and then render it in local time,
 * which shows the previous day for anyone west of Greenwich — and, worse,
 * disagrees between server and client and breaks hydration.
 */

/** Intl tag for a locale, keeping Latin digits in Arabic. */
function tagFor(locale: Locale): string {
  return locale === "ar" ? "ar-u-nu-latn" : "en-US";
}

/** A plain number with thousands separators: 4850 -> "4,850". */
export function formatNumber(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat(tagFor(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * An amount with its currency word: "4,850 SAR" / "4,850 ريال".
 *
 * The currency label is passed in from the dictionary rather than taken from
 * `Intl` currency formatting, which would put the symbol on the wrong side in
 * one language or the other and render it as "SAR 4,850" in English.
 */
export function formatMoney(
  value: number,
  locale: Locale,
  currencyLabel: string,
): string {
  return `${formatNumber(value, locale)} ${currencyLabel}`;
}

/** "2026-10-10" -> "10 October 2026" / "10 أكتوبر 2026". */
export function formatDate(iso: string, locale: Locale): string {
  // Anything that is not a bare calendar date is shown as-is rather than
  // guessed at.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const date = new Date(`${iso}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat(tagFor(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
