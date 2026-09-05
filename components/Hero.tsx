import Image from "next/image";
import Link from "next/link";

import { formatMoney } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export default async function Hero() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-28">

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent-text">
          {t.home.eyebrow}
        </p>

        <h1 className="font-display mt-6 text-4xl leading-[1.15] sm:text-5xl lg:text-7xl">
          {t.home.titleLine1}
          <br />
          <span className="text-primary">{t.home.titleEmphasis}</span>{" "}
          {t.home.titleLine2}
        </h1>

        <p className="mt-7 max-w-md text-base leading-relaxed text-muted sm:text-lg">
          {t.home.lede}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/plan"
            className="rounded-full bg-primary px-8 py-4 font-medium text-primary-fg transition hover:bg-primary-hover"
          >
            {t.home.planTrip}
          </Link>

          <Link
            href="/my-trips"
            className="rounded-full border border-line px-8 py-4 transition hover:bg-surface-2"
          >
            {t.home.myTrips}
          </Link>
        </div>

        {/*
          This strip used to read "60s average plan time", "1 SAR budget
          accuracy" and "18 destinations". None of those were measured — they
          were invented to fill a stats row. Describing what the product does
          is honest and needs no measurement to stand behind.
        */}
        <ul className="mt-14 grid gap-4 border-t border-line pt-7 text-sm text-muted sm:grid-cols-3">
          {t.home.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      {/* Decorative photography — the alt text describes what is actually in
          each frame rather than naming a city, because these are stock
          landscapes, not verified photographs of a specific destination. */}
      <div className="relative hidden h-[520px] lg:block">
        <div className="absolute end-0 top-0 h-[430px] w-[78%] overflow-hidden rounded-[2rem]">
          <Image
            src="https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1000&q=80"
            alt="Desert landscape at golden hour"
            fill
            className="object-cover"
            sizes="40vw"
            priority
            unoptimized
          />
        </div>

        <div className="absolute bottom-0 start-0 h-[250px] w-[58%] overflow-hidden rounded-[2rem] border-8 border-bg">
          <Image
            src="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80"
            alt="Mountain scenery at dusk"
            fill
            className="object-cover"
            sizes="30vw"
            priority
            unoptimized
          />
        </div>

        <div className="absolute bottom-8 end-4 rounded-2xl bg-surface px-6 py-5 shadow-xl">
          <p className="text-xs uppercase tracking-widest text-accent-text">
            {t.home.budgetLabel}
          </p>
          <p dir="auto" className="font-display mt-1 text-xl">
            {formatMoney(4850, locale, t.common.sar)}
          </p>
          <p className="mt-1 text-xs text-muted">{t.home.budgetNote}</p>
        </div>
      </div>

    </section>
  );
}
