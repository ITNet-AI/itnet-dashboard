import type { ReactNode } from "react";

/** A white panel on the Home wash. The header is a title, an optional count and an action, like Section but boxed. */
export function Card({
  title,
  count,
  action,
  children,
  className = "",
  id,
  flush = false,
}: {
  title?: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Lists set their own row padding; flush drops the body padding so rows reach the card edge. */
  flush?: boolean;
}) {
  return (
    <section id={id} className={`card min-w-0 scroll-mt-6 ${className}`}>
      {title ? (
        <div className="flex min-h-12 items-center justify-between gap-4 px-4 pt-3 pb-1">
          <h2 className="text-title font-semibold tracking-tight">
            {title}
            {count !== undefined ? <span className="num ml-2 text-ui font-normal text-ink-3">{count}</span> : null}
          </h2>
          {action}
        </div>
      ) : null}
      <div className={flush ? "" : "px-4 pb-4"}>{children}</div>
    </section>
  );
}

/** Nothing here, said nicely: a small icon in a tinted ring and a line or two of copy. "good" is the green, all-clear face. */
export function Quiet({ icon, title, tone = "neutral", children }: { icon: ReactNode; title: string; tone?: "neutral" | "good"; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className={`grid size-9 place-items-center rounded-full ${tone === "good" ? "bg-good-soft text-good" : "bg-sunk text-ink-2"}`}>{icon}</span>
      <p className="text-body font-semibold">{title}</p>
      {children ? <p className="max-w-[36ch] text-balance text-ui text-ink-2">{children}</p> : null}
    </div>
  );
}
