import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentInBrowser, ConsentView, Problem } from "@/components/oauth/consent-view";
import { getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connect Claude" };

/**
 * Supabase's OAuth server sends people here when an app such as Claude asks to act for them.
 * The details come from Supabase for the signed-in person only. The server asks first; if it can't read the session,
 * the browser asks instead, with the same screen and the same rules.
 */
export default async function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  const { authorization_id: raw, error: problem } = await searchParams;
  const user = await getCurrentUser();
  const person = { name: displayName(user), email: user.email, is_admin: user.is_admin };

  if (problem === "untrusted")
    return <Problem title="This app can't be connected">Only Claude can connect to the dashboard. If you didn&apos;t start this yourself, close this tab.</Problem>;
  const id = typeof raw === "string" ? raw : "";
  if (problem || !/^[A-Za-z0-9_-]{8,128}$/.test(id))
    return <Problem title="This link isn't valid">It may have expired or already been used. Start connecting again from Claude.</Problem>;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) {
    const reason = error ? `${error.message}${error.code ? ` (${error.code})` : ""}` : "no details returned";
    console.error("oauth consent: details failed on the server", JSON.stringify({ user: user.id, code: error?.code, status: error?.status, message: error?.message }));
    // A missing session is the server's problem, not the request's: let the browser, which holds the cookie, try.
    if (error?.name === "AuthSessionMissingError" || /session missing/i.test(error?.message ?? ""))
      return <ConsentInBrowser id={id} person={person} serverReason={reason} />;
    return (
      <Problem title="This link isn't valid" reason={reason}>
        It may have expired or already been used. Start connecting again from Claude.
      </Problem>
    );
  }
  // Already approved before, for these scopes: carry straight on.
  if ("redirect_url" in data) redirect(data.redirect_url);

  return <ConsentView details={data} person={person} mode="server" />;
}
