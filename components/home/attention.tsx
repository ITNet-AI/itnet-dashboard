"use client";

import Link from "next/link";
import { useOptimistic, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { assignTask } from "@/actions/tasks";
import { Avatar, tint } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { GLYPH, Icon } from "@/components/ui/icons";
import { addDays, todayISO } from "@/lib/dates";
import { displayName } from "@/lib/format";
import type { Person } from "@/lib/queries";

export type AttentionKind = "overdue" | "at_risk" | "unassigned" | "renews";

export type AttentionItem = {
  key: string;
  kind: AttentionKind;
  /** Badge text. Projects past due say "Late", tasks say "Overdue"; both sort as overdue. */
  label: string;
  title: string;
  detail: string;
  /** Right-hand text: the lead's name, or a renewal amount. Tasks show the assignee's avatar instead. */
  aside: string;
  href: string;
  project: { id: string; name: string } | null;
  assignee: Person | null;
  /** Set when the row is a task, which is what makes it assignable. */
  taskId: string | null;
};

const KIND: Record<AttentionKind, { chip: string; bar: string; badge: string; icon: ReactNode }> = {
  overdue: { chip: "Overdue", bar: "bg-crit", badge: "bg-crit-soft text-crit", icon: GLYPH.alert },
  at_risk: { chip: "At risk", bar: "bg-warn", badge: "bg-warn-soft text-warn", icon: GLYPH.clock },
  unassigned: { chip: "Unassigned", bar: "bg-ink-3", badge: "bg-sunk text-ink-2", icon: GLYPH.userPlus },
  renews: { chip: "Renewals", bar: "bg-plum", badge: "bg-plum-soft text-plum", icon: GLYPH.repeat },
};
const KINDS: AttentionKind[] = ["overdue", "at_risk", "unassigned", "renews"];
const LIMIT = 8;
const SNOOZE_KEY = "home-snooze";

type Snoozes = Record<string, string>;

/**
 * Snoozes live in this browser only and expire at the team's midnight, so nothing is hidden for anyone else.
 * Read through useSyncExternalStore: the server snapshot is empty, so the first paint shows every row.
 */
const listeners = new Set<() => void>();
let cached = "";
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function snapshot() {
  return localStorage.getItem(SNOOZE_KEY) ?? "";
}
function writeSnoozes(next: Snoozes) {
  if (Object.keys(next).length) localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
  else localStorage.removeItem(SNOOZE_KEY);
  for (const fn of listeners) fn();
}
function parseSnoozes(raw: string, today: string): Snoozes {
  if (raw === cached) return parsed;
  cached = raw;
  try {
    const all = JSON.parse(raw || "{}") as Snoozes;
    parsed = Object.fromEntries(Object.entries(all).filter(([, until]) => until > today));
  } catch {
    parsed = {};
  }
  return parsed;
}
let parsed: Snoozes = {};

export function Attention({ items, people, currentUserId }: { items: AttentionItem[]; people: Person[]; currentUserId: string }) {
  const [filter, setFilter] = useState<AttentionKind | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const snoozed = parseSnoozes(
    useSyncExternalStore(subscribe, snapshot, () => ""),
    todayISO(),
  );
  const [assigning, setAssigning] = useState<AttentionItem | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [rows, setAssignee] = useOptimistic(items, (state, change: { taskId: string; assignee: Person | null }) =>
    state.map((r) => (r.taskId === change.taskId ? { ...r, assignee: change.assignee } : r)),
  );

  const snooze = (key: string) => writeSnoozes({ ...snoozed, [key]: addDays(todayISO(), 1) });
  const unsnooze = () => writeSnoozes({});
  function assign(item: AttentionItem, person: Person | null) {
    if (!item.taskId) return;
    const taskId = item.taskId;
    setAssigning(null);
    setError(undefined);
    startTransition(async () => {
      setAssignee({ taskId, assignee: person });
      const r = await assignTask(taskId, person?.id ?? null);
      if (r?.error) setError(r.error);
    });
  }

  const visible = rows.filter((r) => !snoozed[r.key]);
  const counts = Object.fromEntries(KINDS.map((k) => [k, visible.filter((r) => r.kind === k).length])) as Record<AttentionKind, number>;
  const filtered = filter === "all" ? visible : visible.filter((r) => r.kind === filter);
  const shown = showAll ? filtered : filtered.slice(0, LIMIT);
  const hidden = Object.keys(snoozed).filter((k) => rows.some((r) => r.key === k)).length;

  return (
    <>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3" role="group" aria-label="Filter by status">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} count={visible.length}>
          All
        </Chip>
        {KINDS.map((k) => (
          <Chip key={k} active={filter === k} onClick={() => setFilter(k)} count={counts[k]} disabled={!counts[k]}>
            {KIND[k].chip}
          </Chip>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mx-4 mb-2 rounded-ctl bg-crit-soft px-3 py-2 text-ui text-crit">
          {error}
        </p>
      ) : null}

      {shown.length ? (
        <ul className="border-t border-line">
          {shown.map((r) => (
            <Row
              key={r.key}
              item={r}
              onAssign={() => setAssigning(r)}
              onSnooze={() => snooze(r.key)}
              busy={pending && assigning?.key === r.key}
            />
          ))}
        </ul>
      ) : (
        <p className="border-t border-line px-4 py-6 text-center text-ui text-ink-3">
          {visible.length ? "Nothing in this filter." : hidden ? "Everything here is snoozed until tomorrow." : "Nothing needs you."}
        </p>
      )}

      {filtered.length > LIMIT || hidden ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-meta text-ink-3">
          {filtered.length > LIMIT ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-ink-2 hover:text-ink">
              {showAll ? "Show fewer" : `Show ${filtered.length - LIMIT} more`}
            </button>
          ) : (
            <span />
          )}
          {hidden ? (
            <span>
              {hidden} snoozed until tomorrow.{" "}
              <button type="button" onClick={unsnooze} className="text-ink-2 hover:text-ink">
                Bring back
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      <Dialog open={assigning !== null} onClose={() => setAssigning(null)} title={assigning ? `Assign “${assigning.title}”` : "Assign"}>
        {assigning ? (
          <ul className="-mx-2 flex flex-col">
            {[...people].sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : 0)).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => assign(assigning, p)}
                  aria-pressed={assigning.assignee?.id === p.id}
                  className="flex h-10 w-full items-center gap-3 rounded-ctl px-2 text-left text-body hover:bg-sunk aria-pressed:bg-accent-soft"
                >
                  <Avatar person={p} size={24} />
                  <span className="min-w-0 flex-1 truncate">
                    {displayName(p)}
                    {p.id === currentUserId ? <span className="text-ink-3"> (you)</span> : null}
                  </span>
                  {assigning.assignee?.id === p.id ? <Icon size={14} className="text-accent">{GLYPH.check}</Icon> : null}
                </button>
              </li>
            ))}
            {assigning.assignee ? (
              <li className="mt-1 border-t border-line pt-1">
                <button
                  type="button"
                  onClick={() => assign(assigning, null)}
                  className="flex h-10 w-full items-center gap-3 rounded-ctl px-2 text-left text-body text-ink-2 hover:bg-sunk"
                >
                  <Avatar person={null} size={24} />
                  Leave unassigned
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </Dialog>
    </>
  );
}

function Chip({
  active,
  count,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled && !active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-ui transition-colors disabled:opacity-40 ${
        active ? "border-ink bg-ink text-on-ink" : "border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink"
      }`}
    >
      {children}
      <span className={`num ${active ? "text-on-ink/70" : "text-ink-3"}`}>{count}</span>
    </button>
  );
}

function Row({ item, onAssign, onSnooze, busy }: { item: AttentionItem; onAssign: () => void; onSnooze: () => void; busy: boolean }) {
  const k = KIND[item.kind];
  const badge = (cls = "") => (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-meta font-semibold ${k.badge} ${cls}`}>
      <Icon size={12}>{k.icon}</Icon>
      {item.label}
    </span>
  );
  // An unassigned task swaps its pill for the Assign control; an overdue one keeps its badge and gets Assign on the right.
  const pillIsAssign = item.kind === "unassigned";
  return (
    <li
      className={`group relative flex min-h-14 items-center gap-3 border-b border-line py-2 pr-3 pl-5 transition-colors last:rounded-b-dlg last:border-b-0 hover:bg-sunk ${
        busy ? "opacity-60" : ""
      }`}
    >
      <span aria-hidden="true" className={`absolute inset-y-2.5 left-2 w-[3px] rounded-full ${k.bar}`} />

      <span className="hidden w-[92px] shrink-0 sm:block">{pillIsAssign ? <AssignButton onClick={onAssign} /> : badge()}</span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={item.href} className="truncate text-body group-hover:text-accent">
          {item.title}
        </Link>
        <span className="flex min-w-0 items-center gap-1.5 text-meta text-ink-2">
          {pillIsAssign ? null : badge("sm:hidden")}
          {item.taskId && item.project ? (
            <>
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: tint(item.project.id).solid }} />
              <span className="truncate">{item.project.name}</span>
              <span aria-hidden="true" className="text-ink-3">
                ·
              </span>
            </>
          ) : null}
          <span className="truncate">{item.detail}</span>
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {item.taskId ? (
          item.assignee ? (
            <Avatar person={item.assignee} size={24} />
          ) : (
            <span className={pillIsAssign ? "sm:hidden" : ""}>
              <AssignButton onClick={onAssign} />
            </span>
          )
        ) : (
          <span className="num hidden max-w-36 truncate text-ui text-ink-2 sm:block">{item.aside}</span>
        )}
        <span className="hidden items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 sm:flex">
          {item.taskId && item.assignee ? (
            <IconButton label={`Reassign “${item.title}”`} onClick={onAssign}>
              {GLYPH.userPlus}
            </IconButton>
          ) : null}
          <IconButton label={`Snooze “${item.title}” until tomorrow`} onClick={onSnooze}>
            {GLYPH.snooze}
          </IconButton>
          <Link
            href={item.href}
            aria-label={`Open “${item.title}”`}
            title="Open"
            className="grid size-7 place-items-center rounded-ctl text-ink-3 hover:bg-surface hover:text-ink"
          >
            <Icon size={14}>{GLYPH.right}</Icon>
          </Link>
        </span>
      </span>
    </li>
  );
}

function AssignButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-line-2 px-1.5 text-meta font-semibold text-ink-2 transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
    >
      <Icon size={12}>{GLYPH.userPlus}</Icon>
      Assign
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label.split(" “")[0]}
      className="grid size-7 place-items-center rounded-ctl text-ink-3 hover:bg-surface hover:text-ink"
    >
      <Icon size={14}>{children}</Icon>
    </button>
  );
}
