import "server-only";
import { addDays, chargesBetween, monthBounds, monthlyEquivalent, nextRenewal, todayISO } from "@/lib/dates";
import type { Tables } from "@/lib/database.types";

export type CostRow = Tables<"costs"> & { project: { id: string; name: string } | null };

/** Derived figures for one cost. Subscriptions compute their next renewal from the stored anchor date. */
export function describeCost(c: CostRow, today = todayISO()) {
  const recurring = c.kind === "recurring" && c.interval && c.next_renewal;
  return {
    ...c,
    upcoming: recurring && c.active ? nextRenewal(c.next_renewal!, c.interval!, today) : null,
    perMonth: recurring && c.active ? monthlyEquivalent(Number(c.amount), c.interval!) : 0,
  };
}

export type DescribedCost = ReturnType<typeof describeCost>;

/**
 * What a calendar month cost: one-time spend paid in it plus subscription charges that fall in it.
 * Subscriptions only count from their recorded charge date onward; earlier history isn't known.
 */
export function spendInMonth(costs: CostRow[], anyDayInMonth: string) {
  const { start, end } = monthBounds(anyDayInMonth);
  let total = 0;
  for (const c of costs) {
    const amount = Number(c.amount);
    if (c.kind === "one_time") {
      if (c.paid_on && c.paid_on >= start && c.paid_on <= end) total += amount;
    } else if (c.active && c.interval && c.next_renewal) {
      total += amount * chargesBetween(c.next_renewal, c.interval, start, end);
    }
  }
  return total;
}

export function summarize(costs: CostRow[], today = todayISO()) {
  const described = costs.map((c) => describeCost(c, today));
  const horizon = addDays(today, 30);
  return {
    described,
    runRate: described.reduce((s, c) => s + c.perMonth, 0),
    spentThisMonth: spendInMonth(costs, today),
    renewals: described
      .filter((c) => c.upcoming && c.upcoming <= horizon)
      .sort((a, b) => a.upcoming!.localeCompare(b.upcoming!)),
  };
}
