import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Tables } from "@/lib/database.types";

/**
 * Who is acting and a Supabase client signed in as them. Row level security applies,
 * so a tool can never do more than its caller could in the app.
 */
export type ToolContext = {
  supabase: SupabaseClient<Database>;
  user: Tables<"profiles">;
};

export type ToolResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type Tool<S extends z.ZodType = z.ZodType, T = unknown> = {
  /** snake_case, stable: agents call tools by this name. */
  name: string;
  /** What the tool does, written for an agent deciding whether to call it. */
  description: string;
  input: S;
  /** Admin-only tools refuse members before running. */
  admin?: boolean;
  /** Reads change nothing; the MCP can mark them safe to call without confirmation. */
  readOnly?: boolean;
  run: (ctx: ToolContext, input: z.output<S>) => Promise<ToolResult<T>>;
};

export function defineTool<S extends z.ZodType, T>(tool: Tool<S, T>) {
  return tool;
}

/** The one way to run a tool: validates input, checks admin, never throws. Used by server actions now and the MCP later. */
export async function callTool<S extends z.ZodType, T>(
  tool: Tool<S, T>,
  ctx: ToolContext,
  input: unknown,
): Promise<ToolResult<T>> {
  if (tool.admin && !ctx.user.is_admin) return fail("Only admins can do this.");
  const parsed = tool.input.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (!issue) return fail("Check the input and try again.");
    // Our own messages are written for people; zod's defaults ("Invalid input…") need the field name to be useful.
    const where = issue.path.length && issue.message.startsWith("Invalid") ? `${issue.path.join(".")}: ` : "";
    return fail(where + issue.message);
  }
  try {
    return await tool.run(ctx, parsed.data);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export function ok<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function fail(error: string): ToolResult<never> {
  return { ok: false, error };
}

export const id = z.uuid();
export const optionalId = z.uuid().nullish();
export const optionalDate = z.iso.date().nullish().describe("YYYY-MM-DD");
export const taskStatus = z.enum(["todo", "doing", "done"]);

export function quote(s: string) {
  return `“${s}”`;
}
