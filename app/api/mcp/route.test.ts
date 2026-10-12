import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "@/lib/tools";

// The route's own auth is covered by HTTP checks; here the caller is given, to exercise the transport end to end.
vi.mock("@/lib/mcp/auth", () => ({
  mcpCaller: async () => ({
    clientId: "client-1",
    ctx: {
      supabase: {} as ToolContext["supabase"],
      user: { id: "00000000-0000-4000-8000-000000000002", full_name: "Route Test", email: "route@example.com", is_admin: false },
    },
  }),
}));

const { POST, GET } = await import("./route");

const rpc = (body: object) =>
  new Request("https://dashboard.test/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer x" },
    body: JSON.stringify(body),
  });

describe("POST /api/mcp", () => {
  it("answers initialize with JSON, server instructions included", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("itnet-dashboard");
    expect(body.result.instructions).toContain("whoami");
  });

  it("runs a tool in a single stateless request", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "whoami", arguments: {} } }));
    const body = await res.json();
    expect(body.result.isError).toBeFalsy();
    expect(JSON.parse(body.result.content[0].text).email).toBe("route@example.com");
  });

  it("refuses oversized requests before doing any work", async () => {
    const req = rpc({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    const big = new Request(req, { headers: { ...Object.fromEntries(req.headers), "content-length": String(1024 * 1024) } });
    expect((await POST(big)).status).toBe(413);
  });

  it("has no streams or sessions to offer", async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
});
