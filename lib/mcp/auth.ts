import "server-only";
import { contextFromClaims, verifyAccessToken } from "@/lib/tools/context";
import type { ToolContext } from "@/lib/tools";
import { mcpConfig } from "./config";

export type McpCaller = { ctx: ToolContext; clientId: string };

/** 401 with the challenge that tells an MCP client where to sign in (RFC 9728, MCP authorization spec). */
export function unauthorized(reason: "missing" | "invalid", description?: string) {
  const { metadataUrl } = mcpConfig();
  const params = [
    reason === "invalid" ? `error="invalid_token"` : null,
    description ? `error_description="${description.replace(/"/g, "'")}"` : null,
    `resource_metadata="${metadataUrl}"`,
  ].filter(Boolean);
  return Response.json(
    { error: reason === "missing" ? "unauthorized" : "invalid_token", error_description: description },
    { status: 401, headers: { "WWW-Authenticate": `Bearer ${params.join(", ")}`, "Cache-Control": "no-store" } },
  );
}

/**
 * Who is calling the connector, or the 401 to send back.
 *
 * Accepted only when Supabase's OAuth server issued the token: signed by this project and unexpired (getClaims),
 * issued by this project's auth server, for the authenticated role, and carrying a client_id. The client_id is what
 * separates an OAuth token from a dashboard session token or an API key, which are signed by the same project.
 */
export async function mcpCaller(request: Request): Promise<McpCaller | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]+)$/i.exec(header.trim());
  if (!match) return unauthorized("missing");

  const verified = await verifyAccessToken(match[1]);
  if (!verified) return unauthorized("invalid", "The token is invalid or has expired.");

  const { claims, supabase } = verified;
  const { issuer, clientIds } = mcpConfig();
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const clientId = typeof claims.client_id === "string" ? claims.client_id : null;
  if (claims.iss !== issuer || !audience.includes("authenticated") || claims.role !== "authenticated" || !clientId) {
    return unauthorized("invalid", "This token wasn't issued for the connector.");
  }
  if (clientIds.length && !clientIds.includes(clientId)) return unauthorized("invalid", "This app isn't allowed to connect.");

  const ctx = await contextFromClaims(supabase, claims);
  if (!ctx) return unauthorized("invalid", "No dashboard account for this sign-in.");
  return { ctx, clientId };
}
