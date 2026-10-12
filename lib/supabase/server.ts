import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only. The proxy refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * A client whose session has finished loading. supabase-js's OAuth server helpers (getAuthorizationDetails, approve,
 * deny, grants) read the session without waiting for the client's start-up, which also refreshes the session; when a
 * browser sends more than one auth cookie, that race reads no session at all ("Auth session missing!"). getSession()
 * does wait, so calling it first settles the session before those helpers run.
 */
export async function createReadyClient() {
  const supabase = await createClient();
  await supabase.auth.getSession();
  return supabase;
}
