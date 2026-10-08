import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "ink" | "accent" | "warn" | "crit" | "good";
const TONE: Record<Tone, string> = { ink: "text-ink", accent: "text-accent", warn: "text-warn", crit: "text-crit", good: "text-good" };

/** A row of headline figures in the display face. Each one links to where the number comes from. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="-mx-1 flex flex-wrap gap-x-2 gap-y-3 pb-10">{children}</div>;
}

export function Stat({
  label,
  value,
  detail,
  href,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  detail?: ReactNode;
  href: string;
  tone?: Tone;
}) {
  return (
    <Link href={href} className="group flex min-w-36 flex-1 flex-col gap-1 rounded-ctl px-3 py-2 hover:bg-bg">
      <span className="text-meta font-medium uppercase tracking-wide text-ink-3">{label}</span>
      <span className={`num font-display text-[28px] font-bold leading-none tracking-tight ${TONE[tone]}`}>{value}</span>
      {detail ? <span className="truncate text-meta text-ink-2">{detail}</span> : <span className="h-4" />}
    </Link>
  );
}
