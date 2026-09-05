"use client";

import { useSyncExternalStore } from "react";

import { useLocale } from "@/components/LocaleProvider";

type Theme = "light" | "dark";

/**
 * Light/dark switch.
 *
 * The theme is applied before paint by the inline script in the root layout;
 * this component only reflects and changes it. It renders a placeholder until
 * mounted, because the server has no way to know which theme the browser
 * stored — rendering the wrong icon first would be a hydration mismatch.
 *
 * The class on <html> is the source of truth, and it is read as an external
 * store rather than copied into state on mount. Copying it renders the wrong
 * icon for a frame and then corrects it; reading it directly also means the
 * icon stays right if anything else changes the theme.
 */
export default function ThemeToggle() {
  const { t } = useLocale();

  const theme = useSyncExternalStore(
    subscribeToThemeClass,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    // The server cannot know which theme the browser stored, so it renders the
    // placeholder and the first client render fills it in.
    () => null,
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";

    // Writing the class is what updates the UI: the observer below picks the
    // change up and re-renders this button.
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("tripmate:theme", next);
  }

  if (theme === null) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? t.nav.toLight : t.nav.toDark}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition hover:bg-surface-2 hover:text-ink"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** Notifies React whenever the theme class on <html> changes. */
function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8Z" />
    </svg>
  );
}
