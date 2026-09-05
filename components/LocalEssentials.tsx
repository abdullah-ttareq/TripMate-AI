"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { ResolvedCountry } from "@/lib/data/country-facts";

/**
 * Currency, language, emergency number, plug and time zone.
 *
 * Every row is a lookup from a curated table. None of it is generated: these
 * are facts with correct answers, and a model asked for an emergency number
 * will supply a plausible one whether or not it is right.
 *
 * A country that is not in the table renders nothing at all, rather than a
 * section full of guesses.
 */
export default function LocalEssentials({
  facts,
}: {
  facts: ResolvedCountry | null | undefined;
}) {
  const { t, locale } = useLocale();

  if (!facts) return null;

  const rows = [
    { label: t.essentials.currency, value: facts.currency[locale] },
    { label: t.essentials.language, value: facts.language[locale] },
    { label: t.essentials.emergency, value: facts.emergency[locale] },
    { label: t.essentials.plug, value: facts.plug },
    { label: t.essentials.timezone, value: facts.timezone[locale] },
  ].filter((row) => Boolean(row.value));

  if (rows.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl sm:text-3xl">
        {t.sections.localEssentials}
      </h2>

      <p className="mt-2 text-sm text-muted">{facts.name[locale]}</p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <dt className="text-xs uppercase tracking-[0.2em] text-muted">
              {row.label}
            </dt>

            {/*
              `dir="auto"` because these values are Latin script even in the
              Arabic interface. Without it a plug type or an emergency number
              inherits the page's right-to-left direction and its punctuation
              lands at the wrong end.
            */}
            <dd dir="auto" className="mt-2 font-medium">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
