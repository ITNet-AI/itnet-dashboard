import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The signed-in person's profile, or null. For route handlers, where a redirect would answer a fetch with HTML. Memoized per request. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  return profile;
});

/** The signed-in person's profile. Redirects to /login when there is no session. Memoized per request. */
export const getCurrentUser = cache(async () => {
  const profile = await getSessionUser();
  if (!profile) redirect("/login");
  return profile;
});

/** Admin-only pages and actions. Members get a 404 so the page's existence isn't advertised. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user.is_admin) notFound();
  return user;
}
