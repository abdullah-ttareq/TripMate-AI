"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { credentialsSchema, fieldErrors } from "@/lib/schema";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  /** A non-error outcome worth telling the user about. See the sign-up branch. */
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const parsed = credentialsSchema.safeParse({ email, password });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            // Inert while email confirmation is switched off in Supabase, and
            // kept for the case where it is switched back on: it is what makes
            // the confirmation link point at NEXT_PUBLIC_SITE_URL rather than
            // at the signing-up device's localhost.
            emailRedirectTo: `${siteUrl()}/auth/callback`,
          },
        });

        if (error) {
          setFormError(error.message);
          return;
        }

        // Email confirmation is disabled on the Supabase project, so a
        // successful sign-up comes back already authenticated and the user
        // goes straight to planning.
        if (data.session) {
          router.push("/plan");
          router.refresh();
          return;
        }

        // No session, and no error either. Supabase answers this way when
        // confirmation is turned back on, and also when it hides a duplicate
        // sign-up to avoid revealing which addresses are registered. Neither
        // case means the user is signed in, so this must not redirect into a
        // protected route — the middleware would only bounce them back.
        setNotice(t.auth.accountCreatedSignIn);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setFormError(
          error.message === "Email not confirmed"
            ? t.auth.notConfirmed
            : t.auth.badCredentials,
        );
        return;
      }

      // Go back where they were headed before the login redirect.
      router.push(searchParams.get("next") ?? "/plan");
      router.refresh();
    } catch {
      setFormError(t.auth.unreachable);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <div>
        <label className="mb-2 block text-sm text-muted">{t.auth.email}</label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          dir="ltr"
          placeholder={t.auth.emailPlaceholder}
          disabled={submitting}
          className={inputClass(errors.email)}
        />

        {errors.email && <p className="mt-2 text-sm text-danger">{errors.email}</p>}
      </div>

      <div>
        <label className="mb-2 block text-sm text-muted">{t.auth.password}</label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          dir="ltr"
          placeholder={t.auth.passwordPlaceholder}
          disabled={submitting}
          className={inputClass(errors.password)}
        />

        {errors.password && (
          <p className="mt-2 text-sm text-danger">{errors.password}</p>
        )}
      </div>

      {formError && (
        <p className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {formError}
        </p>
      )}

      {/* Neutral styling: the account was created, so this is not a failure. */}
      {notice && (
        <p className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-primary p-4 font-medium text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? t.auth.working
          : mode === "signup"
            ? t.auth.createAccount
            : t.auth.signIn}
      </button>

      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            {t.auth.haveAccount}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t.auth.goSignIn}
            </Link>
          </>
        ) : (
          <>
            {t.auth.noAccount}{" "}
            <Link href="/signup" className="text-primary hover:underline">
              {t.auth.goSignUp}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function inputClass(error?: string): string {
  const border = error ? "border-danger" : "border-line";
  return `w-full rounded-xl border ${border} bg-bg p-3.5 text-ink outline-none transition focus:border-primary disabled:opacity-60`;
}
