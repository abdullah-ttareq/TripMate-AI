"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { LOCALE_COOKIE } from "@/lib/i18n";

/**
 * Switches the interface language.
 *
 * The choice is written to a cookie and the page is re-rendered on the server,
 * because `dir="rtl"` and the translated strings both come from the server.
 * Flipping them in the browser alone would leave the two out of step.
 */
export default function LocaleToggle() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    // One year, so the choice survives closing the browser.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;

    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={switchLocale}
      disabled={pending}
      aria-label={next === "ar" ? t.nav.toArabic : t.nav.toEnglish}
      className="rounded-full border border-line px-3.5 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
    >
      {next === "ar" ? "عربي" : "EN"}
    </button>
  );
}
