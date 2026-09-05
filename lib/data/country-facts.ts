/**
 * Destination facts: currency, language, time zone, mains plug and emergency
 * number.
 *
 * **Why this is curated rather than fetched.** The obvious source is REST
 * Countries, and this originally used it. Its free v1–v4 API has since been
 * deprecated: the old endpoints now answer HTTP 200 with
 * `{"success": false}` and a migration notice, and v5 requires an API key.
 * Swapping in another keyed service would mean another sign-up for five facts
 * that do not change from one year to the next.
 *
 * Curating them instead makes this deterministic, instant, and immune to a
 * third party going down or changing its terms — and no language model is
 * involved, which matters because a model asked for an emergency number will
 * produce a plausible one whether or not it is correct.
 *
 * The cost is that a country has to be added by hand. That is the intended
 * trade: a country missing from this table shows no essentials section at all,
 * which is honest, rather than a confidently wrong one.
 */

export type CountryFacts = {
  name: { en: string; ar: string };
  currency: { en: string; ar: string };
  language: { en: string; ar: string };
  /** Offset rather than an IANA zone: it is what a traveller actually wants. */
  timezone: { en: string; ar: string };
  /** Plug letters plus mains voltage, e.g. "Type G · 230V". */
  plug: string;
  /**
   * What to dial in an emergency. A string rather than a number because
   * several countries split the service across more than one line.
   */
  emergency: { en: string; ar: string };
};

/** Keyed by ISO 3166-1 alpha-2, uppercase. */
export const COUNTRY_FACTS: Record<string, CountryFacts> = {
  SA: {
    name: { en: "Saudi Arabia", ar: "السعودية" },
    currency: { en: "Saudi riyal (SAR)", ar: "الريال السعودي (SAR)" },
    language: { en: "Arabic", ar: "العربية" },
    timezone: { en: "UTC+3", ar: "UTC+3" },
    plug: "Type G · 230V",
    emergency: { en: "911", ar: "911" },
  },
  AE: {
    name: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
    currency: { en: "UAE dirham (AED)", ar: "الدرهم الإماراتي (AED)" },
    language: { en: "Arabic", ar: "العربية" },
    timezone: { en: "UTC+4", ar: "UTC+4" },
    plug: "Type G · 230V",
    emergency: {
      en: "999 police · 998 ambulance",
      ar: "999 الشرطة · 998 الإسعاف",
    },
  },
  JP: {
    name: { en: "Japan", ar: "اليابان" },
    currency: { en: "Japanese yen (JPY)", ar: "الين الياباني (JPY)" },
    language: { en: "Japanese", ar: "اليابانية" },
    timezone: { en: "UTC+9", ar: "UTC+9" },
    plug: "Type A / B · 100V",
    emergency: {
      en: "110 police · 119 fire and ambulance",
      ar: "110 الشرطة · 119 الإطفاء والإسعاف",
    },
  },
  GB: {
    name: { en: "United Kingdom", ar: "المملكة المتحدة" },
    currency: { en: "Pound sterling (GBP)", ar: "الجنيه الإسترليني (GBP)" },
    language: { en: "English", ar: "الإنجليزية" },
    timezone: { en: "UTC+0, UTC+1 in summer", ar: "UTC+0، وUTC+1 صيفاً" },
    plug: "Type G · 230V",
    emergency: { en: "999 or 112", ar: "999 أو 112" },
  },
  FR: {
    name: { en: "France", ar: "فرنسا" },
    currency: { en: "Euro (EUR)", ar: "اليورو (EUR)" },
    language: { en: "French", ar: "الفرنسية" },
    timezone: { en: "UTC+1, UTC+2 in summer", ar: "UTC+1، وUTC+2 صيفاً" },
    plug: "Type E · 230V",
    emergency: { en: "112", ar: "112" },
  },
  US: {
    name: { en: "United States", ar: "الولايات المتحدة" },
    currency: { en: "US dollar (USD)", ar: "الدولار الأمريكي (USD)" },
    language: { en: "English", ar: "الإنجليزية" },
    // Genuinely spans several zones; naming one would be wrong.
    timezone: { en: "UTC−5 to UTC−10", ar: "من UTC−5 إلى UTC−10" },
    plug: "Type A / B · 120V",
    emergency: { en: "911", ar: "911" },
  },
  EG: {
    name: { en: "Egypt", ar: "مصر" },
    currency: { en: "Egyptian pound (EGP)", ar: "الجنيه المصري (EGP)" },
    language: { en: "Arabic", ar: "العربية" },
    timezone: { en: "UTC+2, UTC+3 in summer", ar: "UTC+2، وUTC+3 صيفاً" },
    plug: "Type C / F · 220V",
    emergency: {
      en: "122 police · 123 ambulance",
      ar: "122 الشرطة · 123 الإسعاف",
    },
  },
  TR: {
    name: { en: "Türkiye", ar: "تركيا" },
    currency: { en: "Turkish lira (TRY)", ar: "الليرة التركية (TRY)" },
    language: { en: "Turkish", ar: "التركية" },
    timezone: { en: "UTC+3", ar: "UTC+3" },
    plug: "Type C / F · 230V",
    emergency: { en: "112", ar: "112" },
  },
  IT: {
    name: { en: "Italy", ar: "إيطاليا" },
    currency: { en: "Euro (EUR)", ar: "اليورو (EUR)" },
    language: { en: "Italian", ar: "الإيطالية" },
    timezone: { en: "UTC+1, UTC+2 in summer", ar: "UTC+1، وUTC+2 صيفاً" },
    plug: "Type C / F / L · 230V",
    emergency: { en: "112", ar: "112" },
  },
  ES: {
    name: { en: "Spain", ar: "إسبانيا" },
    currency: { en: "Euro (EUR)", ar: "اليورو (EUR)" },
    language: { en: "Spanish", ar: "الإسبانية" },
    timezone: { en: "UTC+1, UTC+2 in summer", ar: "UTC+1، وUTC+2 صيفاً" },
    plug: "Type C / F · 230V",
    emergency: { en: "112", ar: "112" },
  },
};

/** The facts plus the code they were found under, as sent to the browser. */
export type ResolvedCountry = CountryFacts & { countryCode: string };

export function countryFactsFor(
  countryCode: string | null | undefined,
): ResolvedCountry | null {
  if (!countryCode) return null;

  const code = countryCode.toUpperCase();
  const facts = COUNTRY_FACTS[code];

  return facts ? { ...facts, countryCode: code } : null;
}
