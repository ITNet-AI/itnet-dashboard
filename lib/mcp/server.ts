import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { via } from "@/lib/activity";
import { rules } from "@/lib/agent/prompt";
import { NEEDS_APPROVAL, toolsFor } from "@/lib/agent/tools";
import { callTool, type Tool, type ToolContext } from "@/lib/tools";
import { mcpConfig } from "./config";

/** Writes that land in the same state however often they run. Lets Claude retry them safely. */
const IDEMPOTENT = new Set(["update_task", "move_task", "set_task_done", "update_project", "update_client", "update_cost", "collect_payment", "set_admin"]);

const title = (name: string) => name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function instructions() {
  return `This connector is the ITNET AI dashboard, where a small team in India tracks projects, tasks, clients and money.

Every tool runs as the person who connected it, with exactly their permissions, and every change shows in the team's activity feed under their name, marked "via Claude".

Call whoami first in a conversation: it says who you are acting for, whether they are an admin, and today's date in Asia/Kolkata. Use that date for "today", "tomorrow" and "this week".

${rules({ site: mcpConfig().site, confirm: "client" })}`;
}

/**
 * An MCP server offering this person's tools. Built per request: the transport is stateless, so nothing is kept
 * between calls, and the tool list always reflects their current admin status.
 */
export function buildMcpServer(ctx: ToolContext, onCall?: (tool: string, ok: boolean, ms: number) => void) {
  const server = new McpServer({ name: "itnet-dashboard", title: "ITNET AI dashboard", version: "1.0.0" }, { instructions: instructions() });

  for (const t of toolsFor(ctx.user)) register(server, ctx, t, onCall);
  return server;
}

function register(server: McpServer, ctx: ToolContext, t: Tool, onCall?: (tool: string, ok: boolean, ms: number) => void) {
  const readOnly = t.readOnly === true;
  server.registerTool(
    t.name,
    {
      title: title(t.name),
      description: t.description,
      inputSchema: t.input as never,
      annotations: {
        title: title(t.name),
        readOnlyHint: readOnly,
        destructiveHint: !readOnly && NEEDS_APPROVAL.has(t.name),
        idempotentHint: readOnly || IDEMPOTENT.has(t.name),
        openWorldHint: false,
      },
    },
    (async (input: unknown) => {
      const started = Date.now();
      const result = await via.run("claude", () => callTool(t, ctx, input));
      onCall?.(t.name, result.ok, Date.now() - started);
      return result.ok
        ? { content: [{ type: "text" as const, text: JSON.stringify(result.data) }] }
        : { content: [{ type: "text" as const, text: result.error }], isError: true };
    }) as never,
  );
}
