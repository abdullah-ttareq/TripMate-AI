import type { Metadata } from "next";
import { Suspense } from "react";

import AuthForm from "@/components/AuthForm";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export const metadata: Metadata = {
  title: "Create Account",
};

export default async function SignUpPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-[1.75rem] border border-line bg-surface p-8 shadow-sm sm:p-10">
        <h1 className="font-display text-center text-3xl sm:text-4xl">
          {t.auth.signUpTitle}
        </h1>

        <p className="mt-3 text-center text-muted">{t.auth.signUpSubtitle}</p>

        <Suspense
          fallback={<p className="mt-8 text-center text-muted">{t.auth.loading}</p>}
        >
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </main>
  );
}
