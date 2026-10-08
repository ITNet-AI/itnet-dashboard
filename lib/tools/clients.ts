import "server-only";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { defineTool, fail, id, ok, quote } from "./define";

const fields = {
  name: z.string({ error: "Give the client a name." }).trim().min(1, "Give the client a name.").max(120),
  contact_name: z.string().max(120).nullish(),
  contact_email: z.email("That contact email doesn't look right.").nullish(),
  notes: z.string().max(10000).nullish(),
};

export const createClient = defineTool({
  name: "create_client",
  description: "Add a client with an optional contact person, email and notes.",
  input: z.object(fields),
  async run({ supabase }, input) {
    const { data, error } = await supabase.from("clients").insert(input).select("id, name").single();
    if (error) return fail(error.message);
    await logActivity(supabase, {
      entity_type: "client",
      entity_id: data.id,
      action: "created",
      summary: `added client ${quote(data.name)}`,
    });
    return ok({ id: data.id });
  },
});

export const updateClient = defineTool({
  name: "update_client",
  description: "Change a client's name, contact or notes. Send only the fields to change.",
  input: z.object({ id, ...fields, name: fields.name.optional() }),
  async run({ supabase }, { id, ...patch }) {
    const { data, error } = await supabase.from("clients").update(patch).eq("id", id).select("id");
    if (error) return fail(error.message);
    if (!data.length) return fail("Client not found.");
    return ok({ id });
  },
});

export const deleteClient = defineTool({
  name: "delete_client",
  description: "Delete a client. Its projects stay and become internal. Admin only.",
  admin: true,
  input: z.object({ id }),
  async run({ supabase }, input) {
    const { error } = await supabase.from("clients").delete().eq("id", input.id);
    if (error) return fail(error.message);
    return ok({ id: input.id });
  },
});
