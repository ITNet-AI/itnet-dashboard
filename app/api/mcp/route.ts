import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { mcpCaller } from "@/lib/mcp/auth";
import { mcpConfig } from "@/lib/mcp/config";
import { buildMcpServer } from "@/lib/mcp/server";

// One JSON-RPC message per request and one tool call at most, so this stays well inside the limit.
export const maxDuration = 30;

const MAX_BODY = 256 * 1024;

/**
 * Best-effort brake on a runaway client: 120 calls a minute per person, per server instance.
 * Instances don't share memory, so this is a guard against loops, not a quota.
 */
const buckets = new Map<string, { tokens: number; at: number }>();
function allow(userId: string) {
  const now = Date.now();
  const b = buckets.get(userId) ?? { tokens: 120, at: now };
  b.tokens = Math.min(120, b.tokens + ((now - b.at) / 60_000) * 120);
  b.at = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  buckets.set(userId, b);
  return true;
}

/**
 * The Claude connector. Stateless Streamable HTTP: each POST carries one JSON-RPC message and gets one JSON reply.
 * Who is calling comes from the bearer token Supabase's OAuth server issued; tools run as that person.
 */
export async function POST(request: Request) {
  if (!mcpConfig().enabled) return new Response("Not found", { status: 404 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return Response.json({ error: "Request too large." }, { status: 413 });

  const caller = await mcpCaller(request);
  if (caller instanceof Response) return caller;
  const { ctx, clientId } = caller;
  if (!allow(ctx.user.id)) return Response.json({ error: "Too many requests. Slow down." }, { status: 429, headers: { "Retry-After": "10" } });

  const server = buildMcpServer(ctx, (tool, ok, ms) =>
    console.info(JSON.stringify({ mcp: "tool", user: ctx.user.id, client: clientId, tool, ok, ms })),
  );
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: MAX_BODY,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("mcp request failed", error);
    return Response.json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null }, { status: 500 });
  } finally {
    // Stateless: nothing outlives the request.
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  }
}

/** No server-initiated streams and no sessions in stateless mode. */
function notAllowed() {
  if (!mcpConfig().enabled) return new Response("Not found", { status: 404 });
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
export const GET = notAllowed;
export const DELETE = notAllowed;
