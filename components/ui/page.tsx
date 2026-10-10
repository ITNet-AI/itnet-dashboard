import Link from "@/components/ui/link";
import type { ReactNode } from "react";

/**
 * The page header is the app's signature: condensed display type with the page's key figure beside it,
 * set in the same face, lighter ink.
 */
export function PageHeader({
  title,
  figure,
  figureLabel,
  children,
  meta,
}: {
  title: string;
  figure?: string | number;
  figureLabel?: string;
  children?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="display flex min-w-0 items-baseline gap-3">
          <span className="min-w-0 break-words">{title}</span>
          {figure !== undefined ? (
            <span className="text-ink-3" aria-label={figureLabel ? `${figure} ${figureLabel}` : undefined}>
              {figure}
            </span>
          ) : null}
        </h1>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
      {meta}
    </header>
  );
}

export function Section({
  title,
  count,
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-6 ${className}`}>
      <div className="flex h-8 items-center justify-between gap-4 border-b border-line">
        <h2 className="font-display text-[15px] font-bold tracking-tight">
          {title}
          {count !== undefined ? <span className="num ml-2 font-sans text-ui font-normal text-ink-3">{count}</span> : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** With an action it becomes a nudge: a dashed card with the next thing to do. Without, a quiet line. */
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  if (!action) return <p className="py-6 text-ui text-ink-3">{children}</p>;
  return (
    <div className="my-4 flex flex-col items-center gap-3 rounded-dlg border border-dashed border-line-2 px-5 py-8 text-center">
      <p className="max-w-[40ch] text-balance text-body text-ink-2">{children}</p>
      {action}
    </div>
  );
}

/** Tabs that are just links, so the filter lives in the URL. */
export function TabLinks({ tabs }: { tabs: { href: string; label: string; active: boolean; count?: number }[] }) {
  return (
    <nav className="-mb-px flex gap-5 overflow-x-auto border-b border-line" aria-label="Filter">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`flex h-9 items-center gap-1.5 whitespace-nowrap border-b-2 text-ui ${
            t.active ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined ? <span className="num text-ink-3">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
