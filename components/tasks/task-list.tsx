"use client";

import Link from "@/components/ui/link";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { setTaskDone } from "@/actions/tasks";
import { PersonName } from "@/components/ui/avatar";
import { Due } from "@/components/ui/badges";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty } from "@/components/ui/page";
import type { TaskRow } from "@/lib/queries";
import { daysBetween, todayISO } from "@/lib/dates";

type Group = { key: string; label: string; tasks: TaskRow[] };

/** Buckets by due date. Done tasks keep their bucket so checking one off doesn't make it jump. */
export function groupByDue(tasks: TaskRow[], today = todayISO()): Group[] {
  const groups: Group[] = [
    { key: "overdue", label: "Overdue", tasks: [] },
    { key: "today", label: "Today", tasks: [] },
    { key: "week", label: "Next 7 days", tasks: [] },
    { key: "later", label: "Later", tasks: [] },
    { key: "none", label: "No due date", tasks: [] },
  ];
  const sorted = [...tasks].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  for (const t of sorted) {
    if (!t.due_date) groups[4].tasks.push(t);
    else {
      const d = daysBetween(today, t.due_date);
      groups[d < 0 ? 0 : d === 0 ? 1 : d <= 7 ? 2 : 3].tasks.push(t);
    }
  }
  return groups.filter((g) => g.tasks.length);
}

export function TaskList({
  tasks,
  showAssignee = false,
  showProject = true,
  empty,
  emptyAction,
  grouped = true,
  progress = false,
  stacked = false,
}: {
  tasks: TaskRow[];
  showAssignee?: boolean;
  showProject?: boolean;
  empty: string;
  emptyAction?: ReactNode;
  grouped?: boolean;
  /** "2 of 6 done" and a bar above the rows. */
  progress?: boolean;
  /** Meta under the title at every width, for narrow columns. */
  stacked?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, change: { id: string; done: boolean }) =>
    state.map((t) => (t.id === change.id ? { ...t, status: change.done ? ("done" as const) : ("todo" as const) } : t)),
  );
  // Tasks ticked in this sitting: these get the one-off pop, ones that arrived done do not.
  const [popped, setPopped] = useState<Set<string>>(() => new Set());
  const [, startTransition] = useTransition();
  const toggle = (id: string, done: boolean) => {
    setPopped((s) => {
      const next = new Set(s);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    });
    startTransition(async () => {
      setOptimistic({ id, done });
      await setTaskDone(id, done);
    });
  };

  if (!optimistic.length) return <Empty action={emptyAction}>{empty}</Empty>;

  const groups: Group[] = grouped ? groupByDue(optimistic) : [{ key: "all", label: "", tasks: optimistic }];
  const done = optimistic.filter((t) => t.status === "done").length;
  return (
    <div className="flex flex-col">
      {progress ? (
        <div className="flex flex-col gap-2 pb-2">
          <p className="num text-meta text-ink-2" aria-live="polite">
            {done} of {optimistic.length} done{done === optimistic.length ? ". That's the lot." : ""}
          </p>
          <span className="relative h-1 overflow-hidden rounded-full bg-sunk" aria-hidden="true">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-good transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round((done / optimistic.length) * 100)}%` }}
            />
          </span>
        </div>
      ) : null}
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.label ? (
            <h3 className={`pb-1 pt-4 text-meta font-medium ${g.key === "overdue" ? "text-crit" : "text-ink-3"}`}>
              {g.label}
            </h3>
          ) : null}
          <ul className="flex flex-col">
            {g.tasks.map((t) => (
              <Row key={t.id} task={t} showAssignee={showAssignee} showProject={showProject} onToggle={toggle} pop={popped.has(t.id)} stacked={stacked} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({
  task,
  showAssignee,
  showProject,
  onToggle,
  pop,
  stacked,
}: {
  task: TaskRow;
  showAssignee: boolean;
  showProject: boolean;
  onToggle: (id: string, done: boolean) => void;
  pop: boolean;
  stacked: boolean;
}) {
  const done = task.status === "done";
  const late = !done && !!task.due_date && task.due_date < todayISO();
  const id = `done-${task.id}`;
  return (
    <li
      className={`group flex min-h-10 items-center gap-3 border-b border-line py-1.5 transition-opacity duration-300 last:border-b-0 ${
        late ? "border-l-2 border-l-crit pl-3" : ""
      } ${done ? "opacity-60" : ""}`}
    >
      <Checkbox
        id={id}
        checked={done}
        pop={pop && done}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        aria-label={done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`}
      />
      <Link
        href={`/projects/${task.project_id}?task=${task.id}`}
        className={`flex min-w-0 flex-1 flex-col gap-0.5 ${stacked ? "" : "sm:flex-row sm:items-center sm:gap-3"}`}
      >
        <span className="min-w-0 flex-1 truncate text-body">
          <span data-done={done} className={`strike inline max-w-full group-hover:text-accent ${done ? "text-ink-3" : ""}`}>
            {task.title}
          </span>
          {task.status === "doing" ? (
            <span className="ml-2 align-middle text-meta font-semibold text-accent">In progress</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-meta text-ink-2 sm:w-auto">
          {showProject && task.project ? <span className="max-w-40 truncate">{task.project.name}</span> : null}
          {showAssignee ? (
            <span className="w-32 truncate">
              <PersonName person={task.assignee} />
            </span>
          ) : null}
          <span className={stacked ? "" : "sm:w-20 sm:text-right"}>{task.due_date ? <Due date={task.due_date} done={done} /> : null}</span>
        </span>
      </Link>
    </li>
  );
}
