"use server";

import { redirect } from "next/navigation";
import { opt, run, text, toState, type ActionState } from "@/lib/action-utils";
import * as projects from "@/lib/tools/projects";

const NEW_CLIENT = "__new__";

/** The form picks a client, or "New client…" with a name typed beside it. */
function read(fd: FormData) {
  const isNew = text(fd, "client_id") === NEW_CLIENT;
  return {
    name: text(fd, "name"),
    description: text(fd, "description"),
    client_id: isNew ? null : text(fd, "client_id"),
    new_client_name: isNew ? (text(fd, "new_client_name") ?? "") : undefined,
    lead_id: text(fd, "lead_id"),
    due_date: text(fd, "due_date"),
    fee: fee(fd),
    status: opt(fd, "status"),
  };
}

/** "₹1,80,000" or "180000" as a number; empty clears it. */
function fee(fd: FormData) {
  const raw = text(fd, "fee")?.replace(/[₹,\s]/g, "");
  return raw == null ? null : Number(raw);
}

/** Money page: the client has paid. */
export async function collectPayment(id: string): Promise<ActionState> {
  return toState(await run(projects.collectPayment, { id }));
}

export async function createProject(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await run(projects.createProject, read(fd));
  if (!result.ok) return toState(result);
  redirect(`/projects/${result.data.id}`);
}

export async function updateProject(_: ActionState, fd: FormData): Promise<ActionState> {
  return toState(await run(projects.updateProject, { id: text(fd, "id"), ...read(fd) }));
}

export async function deleteProject(fd: FormData) {
  const result = await run(projects.deleteProject, { id: text(fd, "id") });
  if (!result.ok) throw new Error(result.error);
  redirect("/projects");
}
