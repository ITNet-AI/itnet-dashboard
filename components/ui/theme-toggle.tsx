"use client";

import { useState, useSyncExternalStore } from "react";

export const THEME_COOKIE = "theme";
export type Theme = "light" | "dark";

const QUERY = "(prefers-color-scheme: dark)";
function subscribe(onChange: () => void) {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Flips between light and dark. With no choice saved the page follows the system, and the server assumes light. */
export function ThemeToggle({ initial, className = "" }: { initial?: Theme; className?: string }) {
  const [chosen, setChosen] = useState<Theme | undefined>(initial);
  const systemDark = useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches, () => false);
  const theme: Theme = chosen ?? (systemDark ? "dark" : "light");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setChosen(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`grid size-7 shrink-0 place-items-center rounded-ctl text-ink-3 hover:bg-sunk hover:text-ink ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
          </>
        ) : (
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
        )}
      </svg>
    </button>
  );
}
