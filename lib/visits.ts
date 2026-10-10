import "server-only";
import type { createClient } from "@/lib/supabase/server";

const SESSION_GAP_MS = 2 * 60 * 60 * 1000;
const FIRST_VISIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Where "since you last looked" starts.
 * A new session (2h+ since the last visit) moves the start to that last visit; refreshes inside a session don't.
 */
export function digestStart(user: { last_seen_at: string | null; digest_from: string | null }) {
  const now = Date.now();
  const last = user.last_seen_at ? new Date(user.last_seen_at).getTime() : null;

  let from: number;
  if (last === null) from = now - FIRST_VISIT_WINDOW_MS;
  else if (now - last > SESSION_GAP_MS) from = last;
  else from = user.digest_from ? new Date(user.digest_from).getTime() : now - FIRST_VISIT_WINDOW_MS;

  return new Date(from).toISOString();
}

/** Stamps the Home visit. Meant to run after the response, so it never holds Home up. */
export async function recordHomeVisit(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, digestFrom: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString(), digest_from: digestFrom })
    .eq("id", userId);
  if (error) console.error("home visit not recorded", error.message);
}
