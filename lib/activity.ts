import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ActivityInput = {
  entity_type: "project" | "task" | "client" | "comment";
  entity_id: string;
  project_id?: string | null;
  action: string;
  summary: string;
  meta?: Json;
};

/**
 * Who made the change, when it wasn't the person clicking. The in-app Agent runs tools inside via.run("agent", …) and the
 * Claude connector inside via.run("claude", …), so every entry they log says so without any tool knowing about it.
 */
export const via = new AsyncLocalStorage<"agent" | "claude">();

/**
 * Appends to the activity log. The log is what the home feed reads, and what agents will read later.
 * Failure to log never fails the user's action.
 */
export async function logActivity(supabase: Supabase, input: ActivityInput) {
  const meta = via.getStore() ? { ...((input.meta ?? {}) as Record<string, Json>), via: via.getStore()! } : (input.meta ?? {});
  const { error } = await supabase.from("activity").insert({ ...input, meta });
  if (error) console.error("activity log failed", error.message);
}
