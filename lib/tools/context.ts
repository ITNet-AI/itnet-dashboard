import "server-only";
import { createClient, type JwtPayload, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ToolContext } from "./define";

/**
 * Checks a person's Supabase access token and returns a client that acts as them, with the token's verified claims.
 * getClaims verifies the signature against the project's published keys (cached in-process) and the expiry.
 * Callers that need more (the Claude connector checks issuer and OAuth client) inspect the claims returned here.
 */
export async function verifyAccessToken(token: string): Promise<{ supabase: SupabaseClient<Database>; claims: JwtPayload } | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { supabase, claims: data.claims };
}

/** The profile behind verified claims, as a tool context. Admin status is read fresh, so revoking it takes effect at once. */
export async function contextFromClaims(supabase: SupabaseClient<Database>, claims: JwtPayload): Promise<ToolContext | null> {
  const { data: user } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  return user ? { supabase, user } : null;
}

/**
 * Builds a tool context from a person's Supabase access token.
 *
 * Who is acting comes only from the token, never from tool input, and every query runs as that person
 * under row level security. A member's agent therefore has exactly that member's rights: it can't read
 * costs, change admin access, delete projects, or post comments or activity as anyone else.
 */
export async function contextFromAccessToken(token: string): Promise<ToolContext | null> {
  const verified = await verifyAccessToken(token);
  return verified ? contextFromClaims(verified.supabase, verified.claims) : null;
}
