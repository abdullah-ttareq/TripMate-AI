"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";
import type { GeneratedTrip } from "@/lib/schema";

export default function SaveTripButton({ trip }: { trip: GeneratedTrip }) {
  const router = useRouter();
  const { t } = useLocale();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not save this trip.");
        return;
      }

      // From here on the trip has a permanent URL of its own.
      router.push(`/result/${data.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-full bg-primary px-7 py-3 font-medium text-primary-fg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {saving ? t.result.saving : t.result.save}
      </button>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
