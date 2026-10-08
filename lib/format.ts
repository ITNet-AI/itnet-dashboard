import { TEAM_TZ, daysBetween, todayISO } from "@/lib/dates";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** ₹1,24,500 (Indian grouping). Shows paise only when the amount has them. */
export function money(amount: number): string {
  return amount % 1 === 0 ? inr.format(amount) : inrExact.format(amount);
}

/** Rounded, for summaries: ₹48,200 */
export function moneyRound(amount: number): string {
  return inr.format(Math.round(amount));
}

const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** 30 Oct, or 30 Oct 2027 when not this year. Input is YYYY-MM-DD. */
export function dateLabel(iso: string, today = todayISO()): string {
  const d = new Date(iso + "T00:00:00Z");
  return iso.slice(0, 4) === today.slice(0, 4) ? shortDate.format(d) : longDate.format(d);
}

export type DueTone = "overdue" | "today" | "soon" | "later";

export function dueInfo(iso: string, today = todayISO()): { label: string; tone: DueTone } {
  const diff = daysBetween(today, iso);
  if (diff < 0) return { label: diff === -1 ? "Yesterday" : `${-diff} days late`, tone: "overdue" };
  if (diff === 0) return { label: "Today", tone: "today" };
  if (diff === 1) return { label: "Tomorrow", tone: "soon" };
  if (diff < 7) return { label: weekday(iso), tone: "soon" };
  return { label: dateLabel(iso, today), tone: "later" };
}

function weekday(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
}

/** "4m", "3h", "2d", then a date. For activity and comments. */
export function ago(timestamp: string, now = new Date()): string {
  const s = Math.max(0, (now.getTime() - new Date(timestamp).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return dateLabel(todayISO(new Date(timestamp)));
}

export function todayHeading(now = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TEAM_TZ }).format(now);
}

export function monthName(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
}

export function initials(name: string | null | undefined, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function displayName(p: { full_name: string; email: string } | null | undefined): string {
  if (!p) return "Unassigned";
  return p.full_name.trim() || p.email.split("@")[0];
}

export function firstName(p: { full_name: string; email: string } | null | undefined): string {
  return displayName(p).split(" ")[0];
}

/** "since 10:30", "since yesterday", "since Tuesday", "since 2 Oct". For the owner's digest. */
export function sinceLabel(timestamp: string, now = new Date()): string {
  const then = new Date(timestamp);
  const day = todayISO(then);
  const diff = daysBetween(day, todayISO(now));
  if (diff <= 0) {
    return "since " + new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TEAM_TZ }).format(then);
  }
  if (diff === 1) return "since yesterday";
  if (diff < 7) return "since " + new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: TEAM_TZ }).format(then);
  return "since " + dateLabel(day);
}
