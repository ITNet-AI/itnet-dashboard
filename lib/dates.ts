// All "today" logic uses the team's timezone so server and browser agree.
export const TEAM_TZ = "Asia/Kolkata";

/** Today as YYYY-MM-DD in the team timezone. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TEAM_TZ }).format(now);
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

/** Adds months to an anchor date, clamping to the last day of the month (Jan 31 + 1 month = Feb 28). */
export function addMonths(iso: string, months: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return format(target);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((parse(toISO).getTime() - parse(fromISO).getTime()) / 86_400_000);
}

export function monthBounds(iso: string): { start: string; end: string } {
  const d = parse(iso);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { start: format(start), end: format(end) };
}

export type Interval = "monthly" | "yearly";
const step = (i: Interval) => (i === "monthly" ? 1 : 12);

/**
 * A subscription stores the date of one charge (its anchor). Charges repeat every interval from there,
 * so the next renewal is computed rather than stored and never goes stale.
 */
export function nextRenewal(anchor: string, interval: Interval, today = todayISO()): string {
  if (anchor >= today) return anchor;
  const months = step(interval);
  // Jump close to today, then walk forward. Always computed from the anchor to avoid day drift.
  const a = parse(anchor);
  const t = parse(today);
  const elapsed = (t.getUTCFullYear() - a.getUTCFullYear()) * 12 + (t.getUTCMonth() - a.getUTCMonth());
  let k = Math.max(0, Math.floor(elapsed / months) - 1);
  let next = addMonths(anchor, k * months);
  while (next < today) {
    k += 1;
    next = addMonths(anchor, k * months);
  }
  return next;
}

/** Charges of a subscription that fall inside [start, end], counting only from the anchor onward. */
export function chargesBetween(anchor: string, interval: Interval, start: string, end: string): number {
  const months = step(interval);
  let count = 0;
  let k = 0;
  let date = anchor;
  while (date <= end && k < 1000) {
    if (date >= start) count += 1;
    k += 1;
    date = addMonths(anchor, k * months);
  }
  return count;
}

export function monthlyEquivalent(amount: number, interval: Interval): number {
  return interval === "monthly" ? amount : amount / 12;
}
