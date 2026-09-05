import Link from "next/link";

import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export default async function CTA() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <section className="bg-primary px-6 py-24 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-3xl text-center text-primary-fg">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl">
          {t.home.ctaTitle}
        </h2>

        <p className="mx-auto mt-5 max-w-lg text-base text-primary-soft sm:text-lg">
          {t.home.ctaBody}
        </p>

        <Link
          href="/plan"
          className="mt-10 inline-block rounded-full bg-accent px-10 py-4 font-medium text-accent-fg transition hover:opacity-90"
        >
          {t.home.ctaButton}
        </Link>
      </div>
    </section>
  );
}
