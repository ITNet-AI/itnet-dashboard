"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { moveTask } from "@/actions/tasks";
import { Avatar } from "@/components/ui/avatar";
import { Due } from "@/components/ui/badges";
import type { TaskRow } from "@/lib/queries";
import { QuickAdd } from "./quick-add";

type Status = "todo" | "doing" | "done";
const COLUMNS: { id: Status; label: string; dot: string }[] = [
  { id: "todo", label: "To do", dot: "border border-ink-3" },
  { id: "doing", label: "In progress", dot: "bg-accent" },
  { id: "done", label: "Done", dot: "bg-good" },
];

type Columns = Record<Status, TaskRow[]>;

function group(tasks: TaskRow[]): Columns {
  const cols: Columns = { todo: [], doing: [], done: [] };
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) cols[t.status].push(t);
  return cols;
}

function findColumn(cols: Columns, id: string): Status | null {
  if (id in cols) return id as Status;
  return (Object.keys(cols) as Status[]).find((k) => cols[k].some((t) => t.id === id)) ?? null;
}

/** Midpoint between neighbours, so a move only ever rewrites the moved task. */
function positionAt(list: TaskRow[], index: number): number {
  const prev = list[index - 1]?.position;
  const next = list[index + 1]?.position;
  if (prev === undefined && next === undefined) return 1024;
  if (prev === undefined) return next! - 1024;
  if (next === undefined) return prev + 1024;
  return (prev + next) / 2;
}

export function Board({ tasks, projectId }: { tasks: TaskRow[]; projectId: string }) {
  const server = useMemo(() => group(tasks), [tasks]);
  const [cols, setCols] = useState(server);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const startColumn = useRef<Status | null>(null);
  const justDragged = useRef(false);
  const dndId = useId(); // stable across server and client, avoids a hydration mismatch in dnd-kit

  // Fresh server data wins once it arrives (adjusting state during render, not in an effect).
  const [seen, setSeen] = useState(server);
  if (seen !== server) {
    setSeen(server);
    setCols(server);
  }

  // "C" opens the quick add in To do, unless typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.closest("input, textarea, select, [contenteditable], dialog")) return;
      const opener = document.getElementById("quick-todo-open");
      if (opener) {
        e.preventDefault();
        opener.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const active = activeId ? Object.values(cols).flat().find((t) => t.id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    startColumn.current = findColumn(cols, String(e.active.id));
    justDragged.current = true;
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(cols, String(active.id));
    const to = findColumn(cols, String(over.id));
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const moving = prev[from].find((t) => t.id === active.id);
      if (!moving) return prev;
      const overIndex = prev[to].findIndex((t) => t.id === over.id);
      const index = overIndex >= 0 ? overIndex : prev[to].length;
      const target = [...prev[to]];
      target.splice(index, 0, { ...moving, status: to });
      return { ...prev, [from]: prev[from].filter((t) => t.id !== active.id), [to]: target };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setTimeout(() => (justDragged.current = false), 0);
    const column = findColumn(cols, String(active.id));
    if (!over || !column) return setCols(server);

    const list = [...cols[column]];
    const from = list.findIndex((t) => t.id === active.id);
    const overIndex = list.findIndex((t) => t.id === over.id);
    const to = overIndex >= 0 ? overIndex : list.length - 1;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);

    if (column === startColumn.current && from === to) return;

    const position = positionAt(list, to);
    list[to] = { ...moved, status: column, position };
    setCols({ ...cols, [column]: list });
    setError(undefined);
    startTransition(async () => {
      const result = await moveTask(moved.id, column, position);
      if (result?.error) {
        setError(result.error);
        setCols(server);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-ui text-crit">{error}</p> : null}
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setCols(server);
        }}
      >
        {/* Phone: one column at a time, swipe sideways. Desktop: three across. */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
          {COLUMNS.map((c) => (
            <Column key={c.id} id={c.id} label={c.label} dot={c.dot} tasks={cols[c.id]} projectId={projectId} justDragged={justDragged} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>{active ? <Card task={active} lifted /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  id,
  label,
  dot,
  tasks,
  projectId,
  justDragged,
}: {
  id: Status;
  label: string;
  dot: string;
  tasks: TaskRow[];
  projectId: string;
  justDragged: React.RefObject<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={`flex min-h-40 w-[84%] shrink-0 snap-center flex-col gap-1.5 rounded-dlg bg-bg p-2 ring-1 transition-[background-color,box-shadow] md:w-auto md:shrink ${
        isOver ? "bg-sunk ring-accent" : "ring-transparent"
      }`}
    >
      <h3 className="flex h-7 items-center gap-2 px-1.5 text-ui font-semibold">
        <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
        {label}
        <span className="num rounded-full bg-surface px-1.5 text-meta font-medium text-ink-2 ring-1 ring-line">{tasks.length}</span>
      </h3>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1.5">
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} justDragged={justDragged} />
          ))}
        </ul>
      </SortableContext>
      <QuickAdd projectId={projectId} status={id} inputId={`quick-${id}`} />
    </section>
  );
}

function SortableCard({ task, justDragged }: { task: TaskRow; justDragged: React.RefObject<boolean> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
      {...attributes}
      {...listeners}
    >
      <Card task={task} justDragged={justDragged} />
    </li>
  );
}

function Card({ task, lifted = false, justDragged }: { task: TaskRow; lifted?: boolean; justDragged?: React.RefObject<boolean> }) {
  const pathname = usePathname();
  const done = task.status === "done";
  return (
    <Link
      href={`${pathname}?task=${task.id}`}
      scroll={false}
      onClick={(e) => {
        if (justDragged?.current) e.preventDefault();
      }}
      draggable={false}
      className={`flex flex-col gap-2 rounded-ctl border bg-surface px-3 py-2.5 transition-[border-color,box-shadow] ${
        lifted
          ? "rotate-[0.6deg] scale-[1.02] border-line-2 shadow-[0_12px_28px_-8px_var(--shadow)]"
          : "border-line hover:border-line-2 hover:shadow-[0_2px_8px_-4px_var(--shadow)]"
      }`}
    >
      <span className={`text-body ${done ? "text-ink-2 line-through decoration-ink-3" : ""}`}>{task.title}</span>
      <span className="flex items-center justify-between gap-2 text-meta">
        <span className="flex items-center gap-2">
          <Avatar person={task.assignee} />
          {task.due_date ? <Due date={task.due_date} done={done} /> : null}
        </span>
        {task.comment_count ? (
          <span className="num flex items-center gap-1 text-ink-3" title={`${task.comment_count} comments`}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 2.5h8v5.5H5.5L3 10V8H2z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            {task.comment_count}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
