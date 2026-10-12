import "server-only";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { todayISO } from "@/lib/dates";
import { money } from "@/lib/format";
import { defineTool, fail, id, ok, optionalDate, optionalId, projectStatus as status, quote, type ToolContext } from "./define";

const name = z.string({ error: "Give the project a name." }).trim().min(1, "Give the project a name.").max(120);
const fee = z.number().min(0, "The fee can't be negative.").nullish().describe("What the client owes for the whole project, in rupees");
const newClientName = z
  .string()
  .trim()
  .min(1, "Type the new client's name, or pick an existing one.")
  .max(120, "Keep the client name under 120 characters.")
  .optional()
  .describe("Creates this client (or reuses one with the same name) instead of passing client_id");

/** A project can name a new client instead of pointing at one. Reuses a same-named client rather than duplicating it. */
async function resolveClient(
  supabase: ToolContext["supabase"],
  clientId: string | null | undefined,
  newName: string | undefined,
): Promise<{ id: string | null | undefined } | { error: string }> {
  if (!newName) return { id: clientId };

  const { data: existing } = await supabase.from("clients").select("id").ilike("name", newName).maybeSingle();
  if (existing) return { id: existing.id };

  const { data, error } = await supabase.from("clients").insert({ name: newName }).select("id, name").single();
  if (error) return { error: error.message };
  await logActivity(supabase, {
    entity_type: "client",
    entity_id: data.id,
    action: "created",
    summary: `added client ${quote(data.name)}`,
  });
  return { id: data.id };
}

export const createProject = defineTool({
  name: "create_project",
  description: "Start a project, optionally for a client (existing by id, or new by name) with a lead and due date.",
  input: z.object({
    name,
    description: z.string().max(4000).nullish(),
    client_id: optionalId.describe("Existing client; omit or null for an internal project"),
    new_client_name: newClientName,
    lead_id: optionalId.describe("Profile id of the project lead"),
    due_date: optionalDate,
    fee,
    status: status.default("active"),
  }),
  async run({ supabase }, { new_client_name, ...fields }) {
    const client = await resolveClient(supabase, fields.client_id, new_client_name);
    if ("error" in client) return fail(client.error);

    const { data, error } = await supabase
      .from("projects")
      .insert({ ...fields, client_id: client.id })
      .select("id, name")
      .single();
    if (error) return fail(error.message);

    await logActivity(supabase, {
      entity_type: "project",
      entity_id: data.id,
      project_id: data.id,
      action: "created",
      summary: `started project ${quote(data.name)}`,
    });
    return ok({ id: data.id });
  },
});

export const updateProject = defineTool({
  name: "update_project",
  description:
    "Change a project. Send only the fields to change; null clears client, lead, due date, fee or brief. " +
    "Moving to billing needs a fee and stamps billed_on; moving to paid stamps paid_on.",
  input: z.object({
    id,
    name: name.optional(),
    description: z.string().max(4000).nullish(),
    client_id: optionalId,
    new_client_name: newClientName,
    lead_id: optionalId,
    due_date: optionalDate,
    fee,
    status: status.optional(),
  }),
  async run({ supabase }, { id, new_client_name, ...fields }) {
    const client = await resolveClient(supabase, fields.client_id, new_client_name);
    if ("error" in client) return fail(client.error);

    const { data: before } = await supabase.from("projects").select("status, lead_id, fee").eq("id", id).maybeSingle();
    if (!before) return fail("Project not found.");

    const patch: typeof fields & { client_id: typeof client.id; billed_on?: string; paid_on?: string } = { ...fields, client_id: client.id };
    const moved = fields.status !== undefined && fields.status !== before.status;
    if (moved && fields.status === "billing") {
      if (!(fields.fee === undefined ? before.fee : fields.fee)) return fail("Set the fee before moving it to billing.");
      patch.billed_on = todayISO();
    }
    if (moved && fields.status === "paid") patch.paid_on = todayISO();

    const { data, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", id)
      .select("id, name, status, lead_id, fee, lead:profiles(full_name, email)")
      .single();
    if (error) return fail(error.message);

    let summary = `updated project ${quote(data.name)}`;
    if (moved) {
      const amount = data.fee ? money(Number(data.fee)) : null;
      if (data.status === "done") summary = `wrapped up ${quote(data.name)}`;
      else if (data.status === "billing") summary = `sent ${quote(data.name)} to billing${amount ? `, ${amount}` : ""}`;
      else if (data.status === "paid") summary = amount ? `collected ${amount} for ${quote(data.name)}` : `marked ${quote(data.name)} paid`;
      else summary = `marked ${quote(data.name)} ${data.status}`;
    } else if (before.lead_id !== data.lead_id && data.lead) {
      summary = `made ${data.lead.full_name || data.lead.email} lead on ${quote(data.name)}`;
    }
    await logActivity(supabase, {
      entity_type: "project",
      entity_id: data.id,
      project_id: data.id,
      action: "updated",
      summary,
    });
    return ok({ id: data.id });
  },
});

export const collectPayment = defineTool({
  name: "collect_payment",
  description: "Record that the client has paid for a project that is in billing. Admin only. Moves it to paid and stamps paid_on.",
  admin: true,
  input: z.object({ id }),
  async run(ctx, input) {
    const { data: before } = await ctx.supabase.from("projects").select("status").eq("id", input.id).maybeSingle();
    if (!before) return fail("Project not found.");
    if (before.status !== "billing") return fail("Only a project in billing can be collected.");
    return updateProject.run(ctx, { id: input.id, status: "paid" });
  },
});

export const deleteProject = defineTool({
  name: "delete_project",
  description: "Delete a project with all its tasks, comments and activity. Admin only. Cannot be undone.",
  admin: true,
  input: z.object({ id }),
  async run({ supabase }, input) {
    const { error } = await supabase.from("projects").delete().eq("id", input.id);
    if (error) return fail(error.message);
    return ok({ id: input.id });
  },
});
