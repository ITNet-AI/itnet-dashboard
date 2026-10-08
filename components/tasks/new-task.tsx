"use client";

import { useActionState, useState } from "react";
import { createTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select } from "@/components/ui/field";
import { displayName } from "@/lib/format";
import type { Person } from "@/lib/queries";

/** New task from anywhere: pick the project and who it's for. */
export function NewTask({
  projects,
  people,
  currentUserId,
  defaultAssignee,
}: {
  projects: { id: string; name: string }[];
  people: Person[];
  currentUserId: string;
  defaultAssignee?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createTask>>, fd: FormData) => {
    const result = await createTask(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  }, null);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} disabled={!projects.length} title={projects.length ? undefined : "Create a project first"}>
        New task
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New task">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="status" value="todo" />
          <Field label="Title" htmlFor="new-task-title">
            <Input id="new-task-title" name="title" required autoFocus placeholder="What needs doing?" />
          </Field>
          <Field label="Project" htmlFor="new-task-project">
            <Select id="new-task-project" name="project_id" required defaultValue="">
              <option value="" disabled>
                Choose a project
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Assignee" htmlFor="new-task-assignee">
              <Select id="new-task-assignee" name="assignee_id" defaultValue={defaultAssignee ?? ""}>
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p)}
                    {p.id === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due" htmlFor="new-task-due">
              <Input id="new-task-due" name="due_date" type="date" />
            </Field>
          </div>
          <FormError message={state?.error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
