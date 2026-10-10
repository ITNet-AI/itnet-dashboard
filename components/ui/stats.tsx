import Link from "@/components/ui/link";
import type { ReactNode } from "react";
import { GLYPH, Icon } from "@/components/ui/icons";

type Tone = "ink" | "accent" | "warn" | "crit" | "good" | "plum";
const CHIP: Record<Tone, string> = {
  ink: "bg-sunk text-ink-2",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
  crit: "bg-crit-soft text-crit",
  good: "bg-good-soft text-good",
  plum: "bg-plum-soft text-plum",
};
/* Only trouble colours the number; a good figure stays in ink and lets the green chip say "fine" quietly. */
const NUMBER: Record<Tone, string> = { ink: "text-ink", accent: "text-ink", warn: "text-warn", crit: "text-crit", good: "text-ink", plum: "text-ink" };

export type Trend = { dir: "up" | "down" | "flat"; label: string };

/** Headline figures as a row of cards, each linking to where the number comes from. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 pb-8 lg:grid-cols-4">{children}</div>;
}

export function Stat({
  label,
  value,
  detail,
  href,
  icon,
  tone = "ink",
  trend,
}: {
  label: string;
  value: string | number;
  detail?: ReactNode;
  href: string;
  icon: ReactNode;
  tone?: Tone;
  trend?: Trend;
}) {
  return (
    <Link
      href={href}
      className="card group flex min-w-0 flex-col gap-3 p-4 transition-[box-shadow,transform] hover:shadow-[0_4px_14px_-6px_var(--shadow)] motion-safe:hover:-translate-y-px"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-meta leading-4 font-semibold uppercase tracking-wide text-ink-3">{label}</span>
        <span className={`grid size-7 shrink-0 place-items-center rounded-ctl ${CHIP[tone]}`}>{icon}</span>
      </span>
      <span className={`num font-display text-[28px] font-semibold leading-none tracking-tight ${NUMBER[tone]}`}>{value}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-2">
        {trend ? (
          <span className={`inline-flex shrink-0 items-center ${trend.dir === "flat" ? "text-ink-3" : "text-ink"}`} aria-hidden="true">
            {trend.dir === "flat" ? <Icon size={12}>{GLYPH.right}</Icon> : <Icon size={12}>{trend.dir === "up" ? GLYPH.up : GLYPH.down}</Icon>}
          </span>
        ) : null}
        <span className="truncate">{trend ? trend.label : detail}</span>
      </span>
    </Link>
  );
}
