"use client";

import { createContext, useContext } from "react";

import { getDictionary } from "@/lib/i18n";
import type { Dictionary, Locale } from "@/lib/i18n";

type Value = { locale: Locale; t: Dictionary };

const LocaleContext = createContext<Value | null>(null);

/**
 * Carries the server-resolved language into client components.
 *
 * The locale is decided on the server from a cookie, so this provider only
 * passes it down — it never guesses, which is what keeps the server and client
 * markup identical.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Value {
  const value = useContext(LocaleContext);

  if (!value) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return value;
}
