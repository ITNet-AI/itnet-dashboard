"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { trustedRedirect } from "@/lib/mcp/config";
import { createClient } from "@/lib/supabase/server";

const ID = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Allow on the consent page. The redirect host is checked again here, not only in the page, so a crafted form post
 * can't approve a client the page refused to show an Allow button for. Server actions are origin-checked by Next.
 */
export async function approveConsent(fd: FormData) {
  await getCurrentUser();
  const id = String(fd.get("authorization_id") ?? "");
  if (!ID.test(id)) redirect("/oauth/consent?error=invalid");

  const supabase = await createClient();
  const { data: details, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (detailsError || !details) redirect("/oauth/consent?error=invalid");
  if ("redirect_url" in details) redirect(details.redirect_url);
  if (!trustedRedirect(details.redirect_uri)) redirect("/oauth/consent?error=untrusted");

  const { data, error } = await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true });
  if (error || !data) redirect("/oauth/consent?error=invalid");
  redirect(data.redirect_url);
}

/** Deny: Supabase sends the person back to the client with access_denied, so Claude shows that it wasn't connected. */
export async function denyConsent(fd: FormData) {
  await getCurrentUser();
  const id = String(fd.get("authorization_id") ?? "");
  if (!ID.test(id)) redirect("/oauth/consent?error=invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  if (error || !data) redirect("/");
  redirect(data.redirect_url);
}

/** Apps the person has connected, for the Disconnect list. Empty when the OAuth server is off. */
export async function listConnections() {
  await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase.auth.oauth.listGrants();
  return (data ?? []).map((g) => ({ clientId: g.client.id, name: g.client.name || "Unnamed app", grantedAt: g.granted_at }));
}

/** Disconnect: revokes consent and the app's refresh tokens, so it has to ask again. Access tokens lapse within the hour. */
export async function disconnect(clientId: string) {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
  revalidatePath("/agent", "layout");
  return error ? { error: error.message } : { ok: true };
}
