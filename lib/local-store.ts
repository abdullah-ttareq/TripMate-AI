/**
 * Reading browser storage as a React external store.
 *
 * `localStorage` is state that lives outside React, and the tempting way to
 * read it — set some state inside an effect on mount — makes React render
 * once with the wrong value and then immediately again with the right one. It
 * also breaks server rendering, because the storage does not exist there.
 *
 * `useSyncExternalStore` is built for exactly this: a subscribe function, a
 * snapshot for the browser, and a separate snapshot for the server. This
 * module supplies the first, and the callers supply their own keys.
 *
 * Snapshots are the raw stored string rather than a parsed object, because
 * `useSyncExternalStore` compares snapshots by identity — returning a freshly
 * parsed array each time would look like a change on every render and loop
 * forever. Callers parse the string in a `useMemo`.
 */

const listeners = new Set<() => void>();

/**
 * Subscribes to storage changes.
 *
 * The browser's own `storage` event only fires for *other* tabs, so writes
 * made here notify the local listeners directly. Without that a tick would be
 * saved but the checkbox would not move until something else re-rendered.
 */
export function subscribeToStorage(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function readStored(store: Storage | null, key: string): string | null {
  if (!store) return null;

  try {
    return store.getItem(key);
  } catch {
    // Storage can be disabled outright by browser settings.
    return null;
  }
}

export function writeStored(
  store: Storage | null,
  key: string,
  value: string,
): void {
  if (!store) return;

  try {
    store.setItem(key, value);
  } catch {
    // A full or disabled store costs persistence, not the change itself.
  }

  for (const listener of listeners) listener();
}

/** Null while rendering on the server, where no storage exists. */
export function browserStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;

  return kind === "local" ? window.localStorage : window.sessionStorage;
}
