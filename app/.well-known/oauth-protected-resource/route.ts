import { mcpConfig } from "@/lib/mcp/config";

/**
 * RFC 9728 protected resource metadata for the Claude connector: names the MCP server and the authorization server
 * (Supabase Auth's OAuth 2.1 server) that issues tokens for it. Clients find it from the 401 on /api/mcp.
 */
export function GET() {
  const { enabled, resource, issuer } = mcpConfig();
  if (!enabled) return new Response("Not found", { status: 404 });
  return Response.json(
    {
      resource,
      authorization_servers: [issuer],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile"],
      resource_name: "ITNET AI dashboard",
    },
    { headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" } },
  );
}
