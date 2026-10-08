import "server-only";
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
 * Appends to the activity log. The log is what the home feed reads, and what agents will read later.
 * Failure to log never fails the user's action.
 */
export async function logActivity(supabase: Supabase, input: ActivityInput) {
  const { error } = await supabase.from("activity").insert({ ...input, meta: input.meta ?? {} });
  if (error) console.error("activity log failed", error.message);
}
