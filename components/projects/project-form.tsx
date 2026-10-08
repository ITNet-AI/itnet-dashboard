"use client";

import { useActionState, useState } from "react";
import { createProject, updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import type { Tables } from "@/lib/database.types";
import { displayName } from "@/lib/format";
import type { Person } from "@/lib/queries";

export function ProjectForm({
  project,
  people,
  clients,
  defaultClientId,
  currentUserId,
  trigger = "New project",
}: {
  project?: Pick<Tables<"projects">, "id" | "name" | "description" | "client_id" | "lead_id" | "due_date" | "status">;
  people: Person[];
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  currentUserId: string;
  trigger?: string;
}) {
  const [open, setOpen] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const close = () => {
    setOpen(false);
    setNewClient(false);
  };
  const save = project ? updateProject : createProject;
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof save>>, fd: FormData) => {
    const result = await save(prev, fd);
    if (result?.ok) close();
    return result;
  }, null);

  return (
    <>
      <Button variant={project ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onClose={close} title={project ? "Edit project" : "New project"}>
        <form action={action} className="flex flex-col gap-4">
          {project ? <input type="hidden" name="id" value={project.id} /> : null}
          <Field label="Name" htmlFor="project-name">
            <Input id="project-name" name="name" defaultValue={project?.name} required autoFocus />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Client"
              htmlFor={newClient ? "project-new-client" : "project-client"}
              hint={newClient ? "Created when you save. Add contact details later on its page." : undefined}
            >
              {newClient ? (
                <div className="flex items-center gap-2">
                  <input type="hidden" name="client_id" value="__new__" />
                  <Input id="project-new-client" name="new_client_name" required autoFocus placeholder="Client name" />
                  <Button variant="ghost" size="sm" onClick={() => setNewClient(false)}>
                    Pick existing
                  </Button>
                </div>
              ) : (
                <Select
                  id="project-client"
                  name="client_id"
                  defaultValue={project?.client_id ?? defaultClientId ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") setNewClient(true);
                  }}
                >
                  <option value="">Internal</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="__new__">New client…</option>
                </Select>
              )}
            </Field>
            <Field label="Lead" htmlFor="project-lead">
              <Select id="project-lead" name="lead_id" defaultValue={project?.lead_id ?? currentUserId}>
                <option value="">No lead</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p)}
                    {p.id === currentUserId ? " (you)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Due" htmlFor="project-due">
              <Input id="project-due" name="due_date" type="date" defaultValue={project?.due_date ?? ""} />
            </Field>
            <Field label="Status" htmlFor="project-status">
              <Select id="project-status" name="status" defaultValue={project?.status ?? "active"}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
              </Select>
            </Field>
          </div>
          <Field label="Brief" htmlFor="project-description">
            <Textarea
              id="project-description"
              name="description"
              defaultValue={project?.description ?? ""}
              rows={3}
              placeholder="What this project delivers, in a sentence or two"
            />
          </Field>
          <FormError message={state?.error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
