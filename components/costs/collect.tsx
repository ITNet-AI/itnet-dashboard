"use client";

import { useState, useTransition } from "react";
import { collectPayment } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { Empty, Section } from "@/components/ui/page";
import { dateLabel, money, moneyRound } from "@/lib/format";

export type Billable = {
  id: string;
  name: string;
  fee: number | null;
  billed_on: string | null;
  paid_on: string | null;
  client: { id: string; name: string } | null;
};

const cols = "grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_120px_104px]";
const cell = `grid ${cols} items-center gap-4 border-b border-line py-2`;

/** Money page: projects the client still owes for, each with a button to record the money as received; then what came in this year. */
export function Collect({ billing, paid }: { billing: Billable[]; paid: Billable[] }) {
  const owed = billing.reduce((s, p) => s + Number(p.fee ?? 0), 0);
  const got = paid.reduce((s, p) => s + Number(p.fee ?? 0), 0);
  const note = [billing.length ? `${moneyRound(owed)} to collect` : null, paid.length ? `${moneyRound(got)} collected this year` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Section title="Payments" count={billing.length} action={note ? <span className="text-ui text-ink-2">{note}</span> : undefined}>
      {billing.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className={`${cell} text-meta text-ink-3`}>
              <span>Project</span>
              <span>Client</span>
              <span>Billed</span>
              <span className="text-right">Fee</span>
              <span />
            </div>
            {billing.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </div>
        </div>
      ) : (
        <Empty>Nothing to collect. When a project&apos;s work is done, move it to Billing from its page and it shows up here.</Empty>
      )}
      {paid.length ? (
        <ul className="pt-4 text-ui text-ink-3">
          {paid.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-4 py-1">
              <span className="truncate">
                <Link href={`/projects/${p.id}`} className="hover:text-ink">
                  {p.name}
                </Link>
                {p.client ? ` · ${p.client.name}` : ""}
              </span>
              <span className="num shrink-0">
                {p.fee != null ? money(Number(p.fee)) : "—"} <span className="text-ink-3">paid {dateLabel(p.paid_on!)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

function Row({ p }: { p: Billable }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className={`${cell} text-body`}>
      <span className="flex min-w-0 flex-col">
        <Link href={`/projects/${p.id}`} className="truncate font-medium hover:text-accent">
          {p.name}
        </Link>
        {error ? <span className="text-meta text-crit">{error}</span> : null}
      </span>
      <span className="truncate text-ui text-ink-2">{p.client?.name ?? "Internal"}</span>
      <span className="num text-ui text-ink-2">{p.billed_on ? dateLabel(p.billed_on) : "—"}</span>
      <span className="num text-right">{p.fee != null ? money(Number(p.fee)) : "—"}</span>
      <span className="text-right">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await collectPayment(p.id);
              if (r?.error) setError(r.error);
            })
          }
        >
          {pending ? "Saving…" : "Collected"}
        </Button>
      </span>
    </div>
  );
}
