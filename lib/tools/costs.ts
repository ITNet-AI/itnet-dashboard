import "server-only";
import { z } from "zod";
import type { TablesInsert } from "@/lib/database.types";
import { defineTool, fail, id, ok, optionalDate, optionalId } from "./define";

// Costs are deliberately not written to the activity log: the log is visible to everyone, money is not.
const fields = z.object({
    name: z.string({ error: "Name what this is for." }).trim().min(1, "Name what this is for.").max(120),
    vendor: z.string().max(120).nullish(),
    amount: z.number({ error: "Enter an amount." }).nonnegative("Amounts can't be negative.").max(1e10).describe("INR"),
    kind: z.enum(["one_time", "recurring"]).describe("recurring = a subscription"),
    interval: z.enum(["monthly", "yearly"]).nullish().describe("Required for recurring"),
    next_renewal: optionalDate.describe("YYYY-MM-DD; required for recurring"),
    paid_on: optionalDate.describe("YYYY-MM-DD; for one-time costs"),
    project_id: optionalId.describe("Project this cost belongs to; omit for company-wide"),
    notes: z.string().max(4000).nullish(),
    active: z.boolean().default(true).describe("false = cancelled subscription, kept for history"),
});

/** Subscriptions need a cycle and a date. Applied to both inputs, which stay plain objects so they describe cleanly to agents. */
const subscriptionRule = <T extends z.ZodType<{ kind: string; interval?: string | null; next_renewal?: string | null }>>(schema: T) =>
  schema.refine((v) => v.kind === "one_time" || Boolean(v.interval && v.next_renewal), {
    message: "Subscriptions need a billing cycle and a renewal date.",
  });

const cost = subscriptionRule(fields);

/** A one-time cost has no cycle; a subscription has no single paid date. */
function toRow(v: z.output<typeof cost>): TablesInsert<"costs"> {
  return v.kind === "one_time" ? { ...v, interval: null, next_renewal: null } : { ...v, paid_on: null };
}

export const createCost = defineTool({
  name: "create_cost",
  description: "Record a one-time cost or a subscription we pay for. Admin only.",
  admin: true,
  input: cost,
  async run({ supabase }, input) {
    const { data, error } = await supabase.from("costs").insert(toRow(input)).select("id").single();
    if (error) return fail(error.message);
    return ok({ id: data.id });
  },
});

export const updateCost = defineTool({
  name: "update_cost",
  description: "Replace a cost's details. Send the full cost, not just the changed fields. Admin only.",
  admin: true,
  input: subscriptionRule(fields.extend({ id })),
  async run({ supabase }, { id, ...rest }) {
    const { data, error } = await supabase.from("costs").update(toRow(rest)).eq("id", id).select("id");
    if (error) return fail(error.message);
    if (!data.length) return fail("Cost not found.");
    return ok({ id });
  },
});

export const deleteCost = defineTool({
  name: "delete_cost",
  description: "Delete a cost. To stop a subscription but keep its history, update it with active: false instead. Admin only.",
  admin: true,
  input: z.object({ id }),
  async run({ supabase }, input) {
    const { error } = await supabase.from("costs").delete().eq("id", input.id);
    if (error) return fail(error.message);
    return ok({ id: input.id });
  },
});
