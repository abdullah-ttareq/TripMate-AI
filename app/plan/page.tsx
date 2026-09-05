import type { Metadata } from "next";

import TripForm from "@/components/TripForm";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export const metadata: Metadata = {
  title: "Plan Your Trip",
};

export default async function PlanPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-line bg-surface p-8 shadow-sm sm:p-10">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-accent-text">
          {t.plan.eyebrow}
        </p>

        <h1 className="font-display mt-4 text-center text-3xl sm:text-4xl">
          {t.plan.title}
        </h1>

        <p className="mt-3 text-center text-muted">{t.plan.subtitle}</p>

        <TripForm />
      </div>
    </main>
  );
}
