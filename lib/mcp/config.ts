import "server-only";

/**
 * Where the Claude connector lives and who vouches for its tokens. Built from env, never from the request's Host,
 * since these values go into security documents that clients trust.
 */
export function mcpConfig() {
  // Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deploy, so a missing NEXT_PUBLIC_SITE_URL can't leak "localhost"
  // into the metadata clients use to find the sign-in server.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? vercel ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return {
    site,
    /** The MCP server's canonical URI: the OAuth "resource". */
    resource: `${site}/api/mcp`,
    /** RFC 9728 metadata, named in every 401 so clients can find the authorization server. */
    metadataUrl: `${site}/.well-known/oauth-protected-resource`,
    /** Supabase Auth's OAuth 2.1 server. Also the iss claim on the tokens it issues. */
    issuer: `${supabase}/auth/v1`,
    /** Optional pin: only tokens issued to these OAuth clients are accepted. */
    clientIds: (process.env.MCP_OAUTH_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    /** Kill switch. Set MCP_DISABLED=1 and both routes answer 404 until it is removed. */
    enabled: process.env.MCP_DISABLED !== "1",
  };
}

export { TRUSTED_REDIRECT_HOSTS, trustedRedirect } from "./trusted";
