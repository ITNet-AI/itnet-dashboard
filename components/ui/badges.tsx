import type { Enums } from "@/lib/database.types";
import { dateLabel, dueInfo } from "@/lib/format";

type Tone = "neutral" | "accent" | "warn" | "good" | "crit";

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-sunk text-ink-2", dot: "border border-ink-3 bg-transparent" },
  accent: { pill: "bg-accent-soft text-accent", dot: "bg-accent" },
  warn: { pill: "bg-warn-soft text-warn", dot: "bg-warn" },
  good: { pill: "bg-good-soft text-good", dot: "bg-good" },
  crit: { pill: "bg-crit-soft text-crit", dot: "bg-crit" },
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-meta font-medium ${tones[tone].pill}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tones[tone].dot}`} />
      {children}
    </span>
  );
}

export const PROJECT_STATUS: Record<Enums<"project_status">, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "accent" },
  paused: { label: "Paused", tone: "warn" },
  done: { label: "Done", tone: "neutral" },
};

export function ProjectStatus({ status }: { status: Enums<"project_status"> }) {
  return <Pill tone={PROJECT_STATUS[status].tone}>{PROJECT_STATUS[status].label}</Pill>;
}

const dueTone = {
  overdue: "text-crit font-medium",
  today: "text-warn font-medium",
  soon: "text-ink-2",
  later: "text-ink-2",
};

/** Due date as words. Done items never read as late. */
export function Due({ date, done = false }: { date: string | null; done?: boolean }) {
  if (!date) return <span className="text-ink-3">No date</span>;
  if (done) return <span className="num whitespace-nowrap text-ink-3">{dateLabel(date)}</span>;
  const { label, tone } = dueInfo(date);
  return <span className={`num whitespace-nowrap ${dueTone[tone]}`}>{label}</span>;
}
