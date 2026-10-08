"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, Section } from "@/components/ui/page";
import { dateLabel, dueInfo, money, moneyRound } from "@/lib/format";
import type { DescribedCost } from "@/lib/costs";
import { CostDialog } from "./cost-form";

type Projects = { id: string; name: string }[];

function useCostDialog() {
  const [editing, setEditing] = useState<DescribedCost | null>(null);
  const [adding, setAdding] = useState<null | "recurring" | "one_time">(null);
  return { editing, setEditing, adding, setAdding };
}

const cell = "grid items-center gap-4 border-b border-line py-2";

/** Full Money page tables: subscriptions, then one-time expenses. */
export function CostTables({ costs, projects }: { costs: DescribedCost[]; projects: Projects }) {
  const d = useCostDialog();
  const subs = costs
    .filter((c) => c.kind === "recurring")
    .sort((a, b) => Number(b.active) - Number(a.active) || (a.upcoming ?? "9").localeCompare(b.upcoming ?? "9"));
  const expenses = costs.filter((c) => c.kind === "one_time").sort((a, b) => (b.paid_on ?? "").localeCompare(a.paid_on ?? ""));
  const subCols = "grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px_110px_100px]";
  const expCols = "grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_100px]";

  return (
    <div className="flex flex-col gap-10">
      <Section
        title="Subscriptions"
        count={subs.filter((s) => s.active).length}
        action={
          <Button size="sm" variant="ghost" onClick={() => d.setAdding("recurring")}>
            Add subscription
          </Button>
        }
      >
        {subs.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className={`${cell} ${subCols} text-meta text-ink-3`}>
                <span>Service</span>
                <span>Project</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Per month</span>
                <span className="text-right">Next charge</span>
              </div>
              {subs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => d.setEditing(c)}
                  className={`${cell} ${subCols} w-full text-left text-body hover:bg-bg ${c.active ? "" : "text-ink-3"}`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.vendor ? <span className="truncate text-meta text-ink-3">{c.vendor}</span> : null}
                  </span>
                  <span className="truncate text-ui text-ink-2">{c.project?.name ?? "Overhead"}</span>
                  <span className="num text-right">
                    {money(Number(c.amount))}
                    <span className="text-meta text-ink-3">{c.interval === "yearly" ? " /yr" : " /mo"}</span>
                  </span>
                  <span className="num text-right text-ink-2">{c.active ? moneyRound(c.perMonth) : "—"}</span>
                  <span className="text-right text-ui">
                    {c.active && c.upcoming ? <RenewalDate date={c.upcoming} /> : <span className="text-ink-3">Cancelled</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Empty>No subscriptions yet. Add the tools the team pays for so renewals show up on Home.</Empty>
        )}
      </Section>

      <Section
        title="One-time expenses"
        count={expenses.length}
        action={
          <Button size="sm" variant="ghost" onClick={() => d.setAdding("one_time")}>
            Add expense
          </Button>
        }
      >
        {expenses.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className={`${cell} ${expCols} text-meta text-ink-3`}>
                <span>Item</span>
                <span>Vendor</span>
                <span>Project</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Paid</span>
              </div>
              {expenses.map((c) => (
                <button key={c.id} type="button" onClick={() => d.setEditing(c)} className={`${cell} ${expCols} w-full text-left text-body hover:bg-bg`}>
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="truncate text-ui text-ink-2">{c.vendor ?? ""}</span>
                  <span className="truncate text-ui text-ink-2">{c.project?.name ?? "Overhead"}</span>
                  <span className="num text-right">{money(Number(c.amount))}</span>
                  <span className="num text-right text-ui text-ink-2">{c.paid_on ? dateLabel(c.paid_on) : "—"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Empty>No one-time expenses recorded.</Empty>
        )}
      </Section>

      <CostDialog
        key={d.editing?.id ?? d.adding ?? "closed"}
        open={Boolean(d.editing || d.adding)}
        onClose={() => {
          d.setEditing(null);
          d.setAdding(null);
        }}
        cost={d.editing}
        defaultKind={d.adding ?? "recurring"}
        projects={projects}
      />
    </div>
  );
}

function RenewalDate({ date }: { date: string }) {
  const { label, tone } = dueInfo(date);
  return <span className={`num ${tone === "today" ? "font-medium text-warn" : "text-ink-2"}`}>{label}</span>;
}

/** Compact version on a project page (admins only). */
export function CompactCosts({
  costs,
  projectId,
  projects,
}: {
  costs: DescribedCost[];
  projectId: string;
  projects: Projects;
}) {
  const d = useCostDialog();
  const total = costs.filter((c) => c.kind === "one_time").reduce((s, c) => s + Number(c.amount), 0);
  const perMonth = costs.reduce((s, c) => s + c.perMonth, 0);
  return (
    <Section
      title="Costs"
      action={
        <Button size="sm" variant="ghost" onClick={() => d.setAdding("one_time")}>
          Add cost
        </Button>
      }
    >
      {costs.length ? (
        <>
          <ul>
            {costs.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => d.setEditing(c)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-line py-2 text-left text-ui hover:bg-bg ${c.active ? "" : "text-ink-3"}`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="num shrink-0 text-ink-2">
                    {money(Number(c.amount))}
                    {c.kind === "recurring" ? (c.interval === "yearly" ? " /yr" : " /mo") : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="num flex justify-between pt-2 text-meta text-ink-2">
            <span>One-time {moneyRound(total)}</span>
            {perMonth ? <span>Recurring {moneyRound(perMonth)} /mo</span> : null}
          </p>
        </>
      ) : (
        <p className="py-4 text-ui text-ink-3">Nothing charged to this project. Only admins see this.</p>
      )}
      <CostDialog
        key={d.editing?.id ?? d.adding ?? "closed"}
        open={Boolean(d.editing || d.adding)}
        onClose={() => {
          d.setEditing(null);
          d.setAdding(null);
        }}
        cost={d.editing}
        defaultKind={d.adding ?? "one_time"}
        defaultProjectId={projectId}
        projects={projects}
      />
    </Section>
  );
}
