import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { approveConsent, denyConsent } from "@/actions/oauth";
import { Button } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { getCurrentUser } from "@/lib/auth";
import { trustedRedirect } from "@/lib/mcp/config";
import { displayName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connect Claude" };

const SCOPE_WORDS: Record<string, string> = {
  openid: "Confirm who you are",
  email: "See your email address",
  profile: "See your name",
};

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="display">{title}</h1>
      <p className="text-pretty text-body text-ink-2">{children}</p>
      <Link href="/" className="text-ui font-semibold text-accent hover:underline">
        Go to the dashboard
      </Link>
    </div>
  );
}

/**
 * Supabase's OAuth server sends people here when an app such as Claude asks to act for them.
 * The details come from Supabase for the signed-in person only; the buttons post to server actions.
 */
export default async function ConsentPage({ searchParams }: PageProps<"/oauth/consent">) {
  const { authorization_id: raw, error: problem } = await searchParams;
  const user = await getCurrentUser();

  if (problem === "untrusted")
    return <Problem title="This app can't be connected">Only Claude can connect to the dashboard. If you didn&apos;t start this yourself, close this tab.</Problem>;
  const id = typeof raw === "string" ? raw : "";
  if (problem || !/^[A-Za-z0-9_-]{8,128}$/.test(id))
    return <Problem title="This link isn't valid">It may have expired or already been used. Start connecting again from Claude.</Problem>;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data)
    return <Problem title="This link isn't valid">It may have expired or already been used. Start connecting again from Claude.</Problem>;
  // Already approved before, for these scopes: carry straight on.
  if ("redirect_url" in data) redirect(data.redirect_url);

  const trusted = trustedRedirect(data.redirect_uri);
  const host = (() => {
    try {
      return new URL(data.redirect_uri).hostname;
    } catch {
      return data.redirect_uri;
    }
  })();
  const scopes = data.scope.split(" ").filter(Boolean);
  const app = data.client.name || "An app";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="display text-balance">Connect {app} to your dashboard?</h1>
        <p className="text-pretty text-body text-ink-2">
          You&apos;re signed in as <span className="font-semibold text-ink">{displayName(user)}</span> ({user.email}).
        </p>
      </div>

      <p className="rounded-ctl bg-warn-soft px-3 py-2 text-ui font-semibold text-warn">
        Only continue if you started this from your own Claude a moment ago.
      </p>

      <div className="flex flex-col gap-2 text-ui text-ink-2">
        <p className="text-ink">If you allow it, {app} can:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-ink-3">
          <li>See and change what you can in the dashboard, and nothing more{user.is_admin ? ", including money and the team, since you're an admin" : ""}.</li>
          <li>Act under your name. Every change shows in the activity feed, marked &ldquo;via Claude&rdquo;.</li>
          {scopes.filter((s) => SCOPE_WORDS[s]).map((s) => (
            <li key={s}>{SCOPE_WORDS[s]}.</li>
          ))}
        </ul>
        <p className="pt-1">You can disconnect any time from the Agent tab, or remove the connector in Claude.</p>
        <p className="text-meta text-ink-3">It will send you back to {host}.</p>
      </div>

      {trusted ? (
        <div className="flex gap-2">
          <form action={approveConsent}>
            <input type="hidden" name="authorization_id" value={data.authorization_id} />
            <Button type="submit" variant="primary">
              Allow
            </Button>
          </form>
          <form action={denyConsent}>
            <input type="hidden" name="authorization_id" value={data.authorization_id} />
            <Button type="submit" variant="secondary">
              Cancel
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-ctl bg-crit-soft px-3 py-2 text-ui text-crit">
            This app isn&apos;t Claude ({host}), so it can&apos;t be connected. If you didn&apos;t start this yourself, close this tab.
          </p>
          <form action={denyConsent}>
            <input type="hidden" name="authorization_id" value={data.authorization_id} />
            <Button type="submit" variant="secondary">
              Cancel
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
