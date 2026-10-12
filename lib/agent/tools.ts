import "server-only";
import { jsonSchema, tool, type JSONSchema7, type ToolSet } from "ai";
import { z } from "zod";
import { via } from "@/lib/activity";
import { callTool, tools, type Tool, type ToolContext } from "@/lib/tools";

/** Tools that change things for good. The model can ask for them, but each one waits for a click in the chat. */
const NEEDS_APPROVAL = new Set(["delete_task", "delete_project", "delete_client", "delete_comment", "delete_cost", "set_admin"]);

/**
 * The anthropic API wants every tool input to be a plain object schema. Most of ours already are; one or two are
 * built with .and(), which serialises to allOf without a top-level type, so the type is always stated here.
 * The zod schema still validates the input inside callTool, so this only describes, it never loosens.
 */
export function inputSchemaFor(t: Tool): JSONSchema7 {
  const schema = z.toJSONSchema(t.input, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete schema.$schema;
  return { ...schema, type: "object" } as JSONSchema7;
}

/** The tools this person may use. Admin tools are left out for members, so the model never sees them; callTool still refuses them. */
export function toolsFor(user: ToolContext["user"]): Tool[] {
  return tools.filter((t) => !t.admin || user.is_admin);
}

/**
 * The dashboard's own tools, offered to the model as the signed-in person. Each call goes through callTool, so it is
 * validated and runs under that person's row level security, exactly like a click in the app.
 */
export function agentTools(ctx: ToolContext) {
  const set: ToolSet = {};
  for (const t of toolsFor(ctx.user)) {
    set[t.name] = tool({
      description: t.description,
      inputSchema: jsonSchema(inputSchemaFor(t)),
      execute: (input: unknown) => via.run("agent", () => callTool(t, ctx, input)),
    });
  }
  const approval = Object.fromEntries(Object.keys(set).filter((n) => NEEDS_APPROVAL.has(n)).map((n) => [n, "user-approval" as const]));
  return { tools: set, approval };
}
