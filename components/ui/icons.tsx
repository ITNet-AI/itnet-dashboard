import type { ReactNode } from "react";

/** 16px line icons on the same grid and stroke as the sidebar's. Pass `size` to scale. */
export function Icon({ children, size = 16, className = "" }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const GLYPH = {
  flame: (
    <>
      <path d="M8 1.5c.5 2.5 3.5 3.8 3.5 7a3.5 3.5 0 0 1-7 0c0-1.3.5-2.3 1.2-3.1.3 1 .9 1.6 1.6 1.6C8.6 5.8 7.2 3.5 8 1.5z" />
    </>
  ),
  folder: (
    <>
      <path d="M2.5 5.5h11v7.5h-11z" />
      <path d="M2.5 5.5V3.5h4l1.5 2" />
    </>
  ),
  rupee: (
    <>
      <path d="M4.5 2.5h7M4.5 5.5h7M4.5 2.5h2a3 3 0 0 1 0 6h-2l5 5" />
    </>
  ),
  repeat: (
    <>
      <path d="M3 7V5.5A2.5 2.5 0 0 1 5.5 3H13M11 1l2 2-2 2" />
      <path d="M13 9v1.5a2.5 2.5 0 0 1-2.5 2.5H3M5 15l-2-2 2-2" />
    </>
  ),
  up: <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />,
  down: <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />,
  right: <path d="M3 8h10M8.5 3.5 13 8l-4.5 4.5" />,
  alert: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5M8 11h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="6.5" cy="5.5" r="2.5" />
      <path d="M1.75 13.5c.5-2.5 2.2-3.75 4.75-3.75s4.25 1.25 4.75 3.75" />
      <path d="M12.5 5v4M10.5 7h4" />
    </>
  ),
  moon: (
    <>
      <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
      <path d="M11.5 2.5v2M10.5 3.5h2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M8 2v3M8 11v3M2 8h3M11 8h3" />
      <path d="M8 5.5 9.2 6.8 10.5 8 9.2 9.2 8 10.5 6.8 9.2 5.5 8l1.3-1.2z" />
    </>
  ),
  check: <path d="M3 8.5 6.5 12 13 4.5" />,
  snooze: (
    <>
      <path d="M2.5 5.5h4l-4 5h4" />
      <path d="M9.5 3h4l-4 5h4" />
    </>
  ),
};
