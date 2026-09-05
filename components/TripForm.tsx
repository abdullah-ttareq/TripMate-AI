"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import { fieldErrors, tripInputSchema } from "@/lib/schema";
import { saveLastTrip } from "@/lib/storage";

type Values = {
  from: string;
  destination: string;
  departureDate: string;
  budget: string;
  days: string;
};

const EMPTY: Values = {
  from: "",
  destination: "",
  departureDate: "",
  budget: "",
  days: "",
};

/**
 * An empty input should say "enter your budget", not "budget must be at least
 * 500" — so blanks become undefined rather than 0.
 */
function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function TripForm() {
  const router = useRouter();
  const { locale, t } = useLocale();

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof Values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));

    // Clear the error as soon as the user starts fixing the field.
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = tripInputSchema.safeParse({
      from: values.from,
      destination: values.destination,
      departureDate: values.departureDate,
      budget: toNumber(values.budget),
      days: toNumber(values.days),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The itinerary itself is written in the reader's language, not just
        // the interface around it.
        body: JSON.stringify({ ...parsed.data, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        // The server re-validates; surface its field errors if it sent any.
        if (data.fields) setErrors(data.fields);
        setFormError(data.error ?? t.plan.generic);
        return;
      }

      saveLastTrip(data);
      router.push("/result");
    } catch {
      setFormError(t.plan.unreachable);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      <Field label={t.plan.from} error={errors.from}>
        <input
          type="text"
          value={values.from}
          onChange={(event) => update("from", event.target.value)}
          placeholder="Riyadh"
          disabled={submitting}
          className={inputClass(errors.from)}
        />
      </Field>

      <Field label={t.plan.destination} error={errors.destination}>
        <input
          type="text"
          value={values.destination}
          onChange={(event) => update("destination", event.target.value)}
          placeholder="AlUla"
          disabled={submitting}
          className={inputClass(errors.destination)}
        />
      </Field>

      <Field label={t.plan.date} error={errors.departureDate}>
        <input
          type="date"
          value={values.departureDate}
          onChange={(event) => update("departureDate", event.target.value)}
          disabled={submitting}
          className={inputClass(errors.departureDate)}
        />
      </Field>

      <Field label={t.plan.budget} error={errors.budget}>
        <input
          type="number"
          value={values.budget}
          onChange={(event) => update("budget", event.target.value)}
          placeholder="5000"
          disabled={submitting}
          className={inputClass(errors.budget)}
        />
      </Field>

      <Field label={t.plan.days} error={errors.days}>
        <input
          type="number"
          value={values.days}
          onChange={(event) => update("days", event.target.value)}
          placeholder="5"
          disabled={submitting}
          className={inputClass(errors.days)}
        />
      </Field>

      {formError && (
        <p className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-primary p-4 font-medium text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t.plan.submitting : t.plan.submit}
      </button>

      {submitting && (
        <p className="text-center text-sm text-muted">{t.plan.patience}</p>
      )}
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>

      {children}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function inputClass(error?: string): string {
  const border = error ? "border-danger" : "border-line";
  return `w-full rounded-xl border ${border} bg-bg p-3.5 text-ink outline-none transition focus:border-primary disabled:opacity-60`;
}
