"use client";

import { useActionState, useRef, useState } from "react";
import { createTask } from "@/actions/tasks";

/** Inline "Add a task" at the foot of a board column. Enter adds and keeps the field open for the next one. */
export function QuickAdd({
  projectId,
  status,
  inputId,
}: {
  projectId: string;
  status: "todo" | "doing" | "done";
  inputId?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createTask>>, fd: FormData) => {
    const result = await createTask(prev, fd);
    if (result?.ok) formRef.current?.reset();
    return result;
  }, null);

  if (!open) {
    return (
      <button
        type="button"
        id={inputId ? `${inputId}-open` : undefined}
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-2 rounded-ctl px-2 text-left text-ui text-ink-3 hover:bg-surface hover:text-ink"
      >
        <span aria-hidden="true" className="text-[15px] leading-none">
          +
        </span>
        Add a task
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="status" value={status} />
      <label htmlFor={inputId ?? `quick-${status}`} className="sr-only">
        New task title
      </label>
      <input
        id={inputId ?? `quick-${status}`}
        name="title"
        autoFocus
        readOnly={pending}
        placeholder="What needs doing? Enter to add"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.value) setOpen(false);
        }}
        className="h-9 w-full rounded-ctl border border-accent bg-surface px-2.5 text-body ring-2 ring-accent-soft placeholder:text-ink-3 focus:outline-none"
      />
      {state?.error ? <p className="px-1 text-meta text-crit">{state.error}</p> : null}
    </form>
  );
}
