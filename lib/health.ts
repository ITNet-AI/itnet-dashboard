import { daysBetween } from "@/lib/dates";
import { dueInfo } from "@/lib/format";

export type Health = "late" | "at_risk" | "on_track";

type ProjectLike = { due_date: string | null; tasks: { status: "todo" | "doing" | "done"; due_date: string | null }[] };

/**
 * A rule of thumb, not a forecast:
 * late     = past its due date with work still open
 * at risk  = due within 7 days and under 75% done, or has overdue tasks
 * on track = everything else
 */
export function projectHealth(p: ProjectLike, today: string): { health: Health; reason: string } {
  const total = p.tasks.length;
  const open = p.tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.due_date && t.due_date < today).length;
  const daysLeft = p.due_date ? daysBetween(today, p.due_date) : null;

  if (daysLeft !== null && daysLeft < 0 && (open.length || !total)) {
    return { health: "late", reason: `${-daysLeft} ${daysLeft === -1 ? "day" : "days"} past due, ${open.length} open` };
  }
  if (daysLeft !== null && daysLeft <= 7) {
    if (!total) return { health: "at_risk", reason: `Due ${dueInfo(p.due_date!, today).label.toLowerCase()}, no tasks planned` };
    if ((total - open.length) / total < 0.75) {
      return { health: "at_risk", reason: `Due ${dueInfo(p.due_date!, today).label.toLowerCase()}, ${open.length} of ${total} open` };
    }
  }
  if (overdue) return { health: "at_risk", reason: `${overdue} overdue ${overdue === 1 ? "task" : "tasks"}` };
  return { health: "on_track", reason: open.length ? `${open.length} open` : "All tasks done" };
}

export const QUIET_DAYS = 5;
