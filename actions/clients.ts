"use server";

import { redirect } from "next/navigation";
import { run, text, toState, type ActionState } from "@/lib/action-utils";
import * as clients from "@/lib/tools/clients";

function read(fd: FormData) {
  return {
    name: text(fd, "name"),
    contact_name: text(fd, "contact_name"),
    contact_email: text(fd, "contact_email"),
    notes: text(fd, "notes"),
  };
}

export async function createClientRecord(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await run(clients.createClient, read(fd));
  if (!result.ok) return toState(result);
  redirect(`/clients/${result.data.id}`);
}

export async function updateClientRecord(_: ActionState, fd: FormData): Promise<ActionState> {
  return toState(await run(clients.updateClient, { id: text(fd, "id"), ...read(fd) }));
}

export async function deleteClientRecord(fd: FormData) {
  const result = await run(clients.deleteClient, { id: text(fd, "id") });
  if (!result.ok) throw new Error(result.error);
  redirect("/clients");
}
