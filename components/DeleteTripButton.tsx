"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/LocaleProvider";

/**
 * Deleting is permanent, so the button asks once before doing it — inline
 * rather than through a browser confirm(), which is easy to dismiss by reflex.
 */
export default function DeleteTripButton({
  tripId,
  title,
  redirectTo,
}: {
  tripId: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { t } = useLocale();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? t.delete.failed);
        setDeleting(false);
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        // Re-fetch the server component so the card disappears.
        router.refresh();
      }
    } catch {
      setError(t.delete.unreachable);
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-full border border-line px-5 py-2.5 text-sm text-muted transition hover:border-danger/50 hover:text-danger"
      >
        {t.delete.button}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
      <p className="text-sm text-ink">
        {t.delete.confirmPrefix} <span className="font-medium">{title}</span>
        {t.delete.confirmSuffix}
      </p>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full bg-danger px-5 py-2 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {deleting ? t.delete.deleting : t.delete.yes}
        </button>

        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-full border border-line bg-surface px-5 py-2 text-sm transition hover:bg-surface-2"
        >
          {t.delete.no}
        </button>
      </div>
    </div>
  );
}
