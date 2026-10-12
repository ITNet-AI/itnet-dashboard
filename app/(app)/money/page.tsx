import type { Metadata } from "next";
import { Collect } from "@/components/costs/collect";
import { CostTables } from "@/components/costs/cost-tables";
import { Stats } from "@/components/home/stats";
import { PageHeader } from "@/components/ui/page";
import { requireAdmin } from "@/lib/auth";
import { summarize } from "@/lib/costs";
import { monthBounds, todayISO } from "@/lib/dates";
import { monthName, moneyRound } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Money" };

export default async function MoneyPage() {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayISO();
  const [{ data: costs }, { data: projects }, { data: billed }] = await Promise.all([
    supabase.from("costs").select("*, project:projects(id, name)"),
    supabase.from("projects").select("id, name").order("name"),
    supabase
      .from("projects")
      .select("id, name, status, fee, billed_on, paid_on, client:clients(id, name)")
      .in("status", ["billing", "paid"])
      .order("billed_on", { ascending: true, nullsFirst: false }),
  ]);
  const billing = (billed ?? []).filter((p) => p.status === "billing");
  const paidThisYear = (billed ?? [])
    .filter((p) => p.status === "paid" && p.paid_on && p.paid_on >= today.slice(0, 4) + "-01-01")
    .sort((a, b) => b.paid_on!.localeCompare(a.paid_on!));
  const { described, runRate, spentThisMonth, renewals } = summarize(costs ?? [], today);
  const { start } = monthBounds(today);
  const oneTimeThisYear = described
    .filter((c) => c.kind === "one_time" && c.paid_on && c.paid_on >= today.slice(0, 4) + "-01-01")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <>
      <PageHeader
        title="Money"
        figure={`${moneyRound(runRate)}/mo`}
        figureLabel="in subscriptions"
        meta={<p className="text-body text-ink-2">Only admins can see this page. Amounts are in rupees.</p>}
      />
      <div className="flex flex-col gap-10">
        <Stats
          items={[
            { label: "Subscriptions a month", value: moneyRound(runRate), note: `${moneyRound(runRate * 12)} a year` },
            { label: `Spent in ${monthName(start)}`, value: moneyRound(spentThisMonth), note: "Expenses plus renewals this month" },
            {
              label: "Renewing in 30 days",
              value: renewals.length,
              note: renewals.length ? moneyRound(renewals.reduce((s, r) => s + Number(r.amount), 0)) : "Nothing due",
            },
            { label: `One-time in ${today.slice(0, 4)}`, value: moneyRound(oneTimeThisYear) },
          ]}
        />
        <Collect billing={billing} paid={paidThisYear} />
        <CostTables costs={described} projects={projects ?? []} />
      </div>
    </>
  );
}
