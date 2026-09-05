"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useLocale } from "@/components/LocaleProvider";
import type { ResolvedCountry } from "@/lib/data/country-facts";
import {
  browserStorage,
  readStored,
  subscribeToStorage,
  writeStored,
} from "@/lib/local-store";

/**
 * A short pre-trip checklist, ticked off locally.
 *
 * Deliberately small. It is a reminder of things people forget, not a task
 * manager — no due dates, no sub-tasks, no ordering, and nothing stored on the
 * server. State lives in `localStorage` under the trip's own key, so ticks
 * survive a refresh and stay on the machine that made them.
 *
 * On entry requirements it says "check", never "you need a visa" or "you do
 * not". Visa rules depend on nationality, residence, purpose and the date, and
 * none of that is known here. Pointing someone at the question is useful;
 * answering it would be a legal claim this app is in no position to make.
 */

const STORAGE_PREFIX = "tripmate:checklist";

export default function TripChecklist({
  tripKey,
  facts,
}: {
  tripKey: string;
  facts: ResolvedCountry | null | undefined;
}) {
  const { t } = useLocale();

  const storageKey = `${STORAGE_PREFIX}:${tripKey}`;

  // Storage is read as an external store rather than copied into state on
  // mount. Doing the latter renders every box unticked for a frame before
  // correcting itself, which is visible as a flicker on a saved trip.
  const raw = useSyncExternalStore(
    subscribeToStorage,
    useCallback(
      () => readStored(browserStorage("local"), storageKey),
      [storageKey],
    ),
    () => null,
  );

  const ticked = useMemo(() => parseTicks(raw), [raw]);

  function toggle(id: string) {
    const next = ticked.includes(id)
      ? ticked.filter((value) => value !== id)
      : [...ticked, id];

    // Writing notifies the store, which re-renders this component with the new
    // value — so there is no component state to keep in step with storage.
    writeStored(browserStorage("local"), storageKey, JSON.stringify(next));
  }

  const items = buildItems(t, facts);
  const doneCount = items.filter((item) => ticked.includes(item.id)).length;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl sm:text-3xl">
          {t.sections.beforeYouGo}
        </h2>

        <p className="text-sm text-muted">
          {doneCount}/{items.length} {t.checklist.done}
        </p>
      </div>

      <p className="mt-2 text-sm text-muted">{t.sections.beforeYouGoLede}</p>

      <ul className="mt-6 space-y-2">
        {items.map((item) => {
          const checked = ticked.includes(item.id);

          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary/40">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                />

                <span
                  className={
                    checked ? "text-muted line-through" : "text-ink"
                  }
                >
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The stored value, defaulting to nothing ticked when absent or corrupt. */
function parseTicks(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

type ChecklistItem = { id: string; label: string };

/**
 * The list, adapted to the destination where there is something real to adapt
 * to. The plug row names the actual plug type once the country is known;
 * everything else applies to any trip.
 */
function buildItems(
  t: ReturnType<typeof useLocale>["t"],
  facts: ResolvedCountry | null | undefined,
): ChecklistItem[] {
  return [
    { id: "passport", label: t.checklist.passport },
    { id: "entry", label: t.checklist.entry },
    { id: "esim", label: t.checklist.esim },
    {
      id: "adapter",
      label: facts?.plug
        ? `${t.checklist.adapter} — ${facts.plug}`
        : t.checklist.adapter,
    },
    { id: "money", label: t.checklist.money },
    { id: "transport", label: t.checklist.transport },
    { id: "clothing", label: t.checklist.clothing },
    { id: "maps", label: t.checklist.offlineMaps },
  ];
}
