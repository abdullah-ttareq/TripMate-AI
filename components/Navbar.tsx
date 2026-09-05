import Link from "next/link";

import LocaleToggle from "@/components/LocaleToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import { createClient } from "@/lib/supabase/server";

export default async function Navbar() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = getDictionary(locale);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-5 py-4 sm:px-8 sm:py-5">

        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold sm:text-2xl">
            TripMate
          </span>
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent-text">
            AI
          </span>
        </Link>

        <div className="order-last flex w-full items-center gap-6 text-sm text-muted sm:order-none sm:w-auto sm:gap-9">
          <Link href="/" className="transition hover:text-ink">{t.nav.home}</Link>
          <Link href="/plan" className="transition hover:text-ink">{t.nav.plan}</Link>
          <Link href="/my-trips" className="transition hover:text-ink">{t.nav.myTrips}</Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleToggle />
          <ThemeToggle />

          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-line px-5 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                {t.nav.signOut}
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-6 py-2.5 text-sm text-primary-fg transition hover:bg-primary-hover"
            >
              {t.nav.signIn}
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
