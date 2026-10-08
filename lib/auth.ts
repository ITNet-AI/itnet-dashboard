import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The signed-in person's profile. Redirects to /login when there is no session. Memoized per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (!profile) redirect("/login");
  return profile;
});

/** Admin-only pages and actions. Members get a 404 so the page's existence isn't advertised. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user.is_admin) notFound();
  return user;
}
