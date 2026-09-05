import { formatMoney, formatNumber } from "@/lib/format";
import { DESTINATIONS, getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export default async function Features() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <>
      <section className="bg-surface-2 px-6 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl">
              {t.home.whereNext}
            </h2>
            <span className="text-sm text-accent-text">{t.home.popular}</span>
          </div>

          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {DESTINATIONS.map((d) => (
              <div
                key={d.key}
                className="group overflow-hidden rounded-[1.75rem] bg-surface"
              >
                {/*
                  Placeholder rather than a photo.

                  The stock images previously here did not actually show these
                  destinations — one labelled AlUla was a Dubai hotel. Naming a
                  city under the wrong photograph is worse than showing none,
                  so the slot waits for verified photography.
                */}
                <div className="relative h-60 overflow-hidden bg-gradient-to-br from-primary via-primary-hover to-accent sm:h-64">
                  <div className="absolute inset-0 flex items-end p-7">
                    <span className="font-display text-4xl text-white/95">
                      {d.name[locale]}
                    </span>
                  </div>
                </div>

                <div className="p-7">
                  <h3 className="font-display text-2xl">{d.name[locale]}</h3>

                  <p className="mt-2 text-sm text-muted">
                    {formatNumber(d.nights, locale)} {t.home.nights} ·{" "}
                    {t.home.from} {formatMoney(d.from, locale, t.common.sar)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-12 md:grid-cols-3">
          {t.home.steps.map((s, i) => (
            <div key={s.title}>
              <p className="text-xs tracking-[0.3em] text-accent-text">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-display mt-5 text-2xl">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
