import type { Metadata } from "next";
import { Suspense } from "react";

import AuthForm from "@/components/AuthForm";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-[1.75rem] border border-line bg-surface p-8 shadow-sm sm:p-10">
        <h1 className="font-display text-center text-3xl sm:text-4xl">
          {t.auth.signInTitle}
        </h1>

        <p className="mt-3 text-center text-muted">{t.auth.signInSubtitle}</p>

        {/* AuthForm reads the ?next= search param, so it needs a Suspense boundary. */}
        <Suspense
          fallback={<p className="mt-8 text-center text-muted">{t.auth.loading}</p>}
        >
          <AuthForm mode="signin" />
        </Suspense>
      </div>
    </main>
  );
}
