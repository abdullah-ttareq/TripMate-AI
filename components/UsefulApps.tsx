"use client";

import { useLocale } from "@/components/LocaleProvider";
import { APP_CATEGORIES, usefulAppsFor } from "@/lib/data/useful-apps";
import type { AppCategory } from "@/lib/data/useful-apps";

/**
 * Everyday apps that work at the destination.
 *
 * Reads a curated table keyed by country. When a country is not in it, this
 * says so plainly — there is no fallback to a nearby country's apps and
 * nothing is generated, because a wrong delivery app is a traveller standing
 * in a foreign city with something that does not work.
 */
export default function UsefulApps({
  countryCode,
}: {
  countryCode: string | null | undefined;
}) {
  const { t, locale } = useLocale();
  const apps = usefulAppsFor(countryCode);

  // Still resolving the destination. Rendering the unavailable state here
  // would flash "no apps" for every trip before the answer arrives.
  if (!countryCode) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl sm:text-3xl">
        {t.sections.usefulApps}
      </h2>

      {!apps ? (
        <p className="mt-4 rounded-2xl border border-line bg-surface p-6 text-muted">
          {t.sections.appsUnavailable}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t.sections.usefulAppsLede}</p>

          <div className="mt-6 space-y-6">
            {APP_CATEGORIES.map((category) => {
              const inCategory = apps.filter((app) => app.category === category);

              if (inCategory.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-accent-text">
                    {t.appCategories[category as AppCategory]}
                  </h3>

                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {inCategory.map((app) => (
                      <li key={app.name}>
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-full rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/40"
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            {app.name}

                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                              className="shrink-0 text-muted rtl:-scale-x-100"
                            >
                              <path d="M7 17 17 7M9 7h8v8" />
                            </svg>
                          </span>

                          <span className="mt-1 block text-sm text-muted">
                            {app.description[locale]}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
