"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { deleteTask, updateTask } from "@/actions/tasks";
import { Comments } from "@/components/comments/comments";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { ago, displayName } from "@/lib/format";
import type { Person, TaskDetail } from "@/lib/queries";

/** Opened by ?task=<id> on any page, so every task has a link that can be shared or sent by an agent. */
export function TaskDialog({
  detail,
  people,
  currentUserId,
  isAdmin,
}: {
  detail: TaskDetail;
  people: Person[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { task, comments } = detail;

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete("task");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof updateTask>>, fd: FormData) => {
    const result = await updateTask(prev, fd);
    if (result?.ok) close();
    return result;
  }, null);

  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string>();

  return (
    <Dialog open onClose={close} title={task.project?.name ?? "Task"} width="lg">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={task.id} />
        <label htmlFor="task-title" className="sr-only">
          Title
        </label>
        <input
          id="task-title"
          name="title"
          defaultValue={task.title}
          required
          className="-mx-1 rounded-ctl px-1 py-1 text-[20px] font-semibold leading-7 tracking-[-0.01em] hover:bg-sunk focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent-soft"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Status" htmlFor="task-status">
            <Select id="task-status" name="status" defaultValue={task.status}>
              <option value="todo">To do</option>
              <option value="doing">In progress</option>
              <option value="done">Done</option>
            </Select>
          </Field>
          <Field label="Assignee" htmlFor="task-assignee">
            <Select id="task-assignee" name="assignee_id" defaultValue={task.assignee_id ?? ""}>
              <option value="">Unassigned</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                  {p.id === currentUserId ? " (you)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due" htmlFor="task-due">
            <Input id="task-due" name="due_date" type="date" defaultValue={task.due_date ?? ""} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="task-description">
          <Textarea
            id="task-description"
            name="description"
            defaultValue={task.description ?? ""}
            rows={4}
            placeholder="Context, links, acceptance criteria"
          />
        </Field>
        <FormError message={state?.error ?? deleteError} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-meta text-ink-3">
            Added by {displayName(task.creator)} {ago(task.created_at)}
          </p>
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <span className="text-ui text-ink-2">Delete this task?</span>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
                <Button
                  variant="danger"
                  disabled={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      const r = await deleteTask(task.id);
                      if (r?.error) setDeleteError(r.error);
                      else close();
                    })
                  }
                >
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="danger" onClick={() => setConfirming(true)}>
                  Delete
                </Button>
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4">
        <h3 className="text-ui font-semibold">
          Comments{comments.length ? <span className="num ml-2 font-normal text-ink-3">{comments.length}</span> : null}
        </h3>
        <Comments comments={comments} taskId={task.id} currentUserId={currentUserId} isAdmin={isAdmin} />
      </div>
    </Dialog>
  );
}
