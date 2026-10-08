import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callTool, type Tool, type ToolResult } from "@/lib/tools";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

/** Every action re-reads the session; never trust the client for who is acting. */
export async function actionContext() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  return { user, supabase };
}

/** Everything is per-request anyway; this clears the client router cache so every view shows fresh data. */
export function refresh() {
  revalidatePath("/", "layout");
}

/** Runs a tool as the signed-in person and refreshes views when it succeeds. */
export async function run<T>(tool: Tool<never, T> | Tool, input: unknown): Promise<ToolResult<T>> {
  const result = (await callTool(tool as Tool, await actionContext(), input)) as ToolResult<T>;
  if (result.ok) refresh();
  return result;
}

export function toState(result: ToolResult<unknown>, message?: string): ActionState {
  return result.ok ? { ok: true, message } : { error: result.error };
}

/** FormData value as trimmed string, or null when empty. */
export function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Like text, but an empty field is left out, so the tool applies its default. */
export function opt(fd: FormData, key: string): string | undefined {
  return text(fd, key) ?? undefined;
}
