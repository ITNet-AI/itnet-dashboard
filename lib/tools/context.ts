import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ToolContext } from "./define";

/**
 * Builds a tool context from a person's Supabase access token, which is how an agent (via the MCP) will call tools.
 *
 * Who is acting comes only from the token, never from tool input, and every query runs as that person
 * under row level security. A member's agent therefore has exactly that member's rights: it can't read
 * costs, change admin access, delete projects, or post comments or activity as anyone else.
 * Admin status is read fresh from the database on every call, so revoking admin takes effect immediately.
 */
export async function contextFromAccessToken(token: string): Promise<ToolContext | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data } = await supabase.auth.getClaims(token);
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const { data: user } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  return user ? { supabase, user } : null;
}
