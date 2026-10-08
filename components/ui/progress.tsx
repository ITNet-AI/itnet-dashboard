import type { Health } from "@/lib/health";

const FILL: Record<Health | "accent", string> = { late: "bg-crit", at_risk: "bg-warn", on_track: "bg-good", accent: "bg-accent" };

/** Done / total as a thin bar plus the count. The count carries the meaning; the bar is for scanning. */
export function Progress({ done, total, tone = "accent" }: { done: number; total: number; tone?: Health | "accent" }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2.5" title={`${done} of ${total} tasks done`}>
      <span className="relative h-1 w-14 overflow-hidden rounded-full bg-sunk" aria-hidden="true">
        <span className={`bar-in absolute inset-y-0 left-0 rounded-full ${FILL[tone]}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="num text-meta text-ink-2">
        {done}/{total}
      </span>
    </span>
  );
}
