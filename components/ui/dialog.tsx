"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native <dialog> with showModal: focus trap, Esc to close and backdrop come from the browser.
 * Controlled by `open`; `onClose` fires on Esc, backdrop click, or the close button.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className={`m-auto w-[calc(100%-32px)] rounded-dlg border border-line bg-surface p-0 text-ink shadow-[0_12px_40px_-12px_var(--shadow)] ${
        width === "lg" ? "max-w-[760px]" : "max-w-[460px]"
      }`}
    >
      {open ? (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
            <h2 className="text-title font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 grid size-7 place-items-center rounded-ctl text-ink-3 hover:bg-sunk hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
