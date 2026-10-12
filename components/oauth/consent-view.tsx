"use client";

import { useEffect, useState, useTransition } from "react";
import { approveConsent, denyConsent } from "@/actions/oauth";
import { Button } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { trustedRedirect } from "@/lib/mcp/trusted";
import { createClient } from "@/lib/supabase/client";

export type ConsentDetails = { authorization_id: string; redirect_uri: string; client: { name: string }; scope: string };
type Person = { name: string; email: string; is_admin: boolean };

const SCOPE_WORDS: Record<string, string> = {
  openid: "Confirm who you are",
  email: "See your email address",
  profile: "See your name",
};

export function Problem({ title, children, reason }: { title: string; children: React.ReactNode; reason?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="display">{title}</h1>
      <p className="text-pretty text-body text-ink-2">{children}</p>
      {reason ? <p className="text-meta text-ink-3">Reason: {reason}</p> : null}
      <Link href="/" className="text-ui font-semibold text-accent hover:underline">
        Go to the dashboard
      </Link>
    </div>
  );
}

const hostOf = (uri: string) => {
  try {
    return new URL(uri).hostname;
  } catch {
    return uri;
  }
};

/**
 * The consent screen. "server" posts to server actions; "browser" talks to Supabase from the page with the browser
 * client, for when the server couldn't read the session. Both refuse any app that doesn't return to Claude.
 */
export function ConsentView({ details, person, mode }: { details: ConsentDetails; person: Person; mode: "server" | "browser" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const trusted = trustedRedirect(details.redirect_uri);
  const host = hostOf(details.redirect_uri);
  const app = details.client.name || "An app";
  const scopes = details.scope.split(" ").filter((s) => SCOPE_WORDS[s]);

  function decide(allow: boolean) {
    start(async () => {
      const auth = createClient().auth.oauth;
      const { data, error } = allow
        ? await auth.approveAuthorization(details.authorization_id, { skipBrowserRedirect: true })
        : await auth.denyAuthorization(details.authorization_id, { skipBrowserRedirect: true });
      if (error || !data) return setError(error?.message ?? "That didn't go through. Start again from Claude.");
      // The same rule as the server: only ever hand the code back to Claude.
      if (!trustedRedirect(data.redirect_url)) return setError("This app isn't Claude, so it can't be connected.");
      window.location.assign(data.redirect_url);
    });
  }

  const Allow =
    mode === "server" ? (
      <form action={approveConsent}>
        <input type="hidden" name="authorization_id" value={details.authorization_id} />
        <Button type="submit" variant="primary">
          Allow
        </Button>
      </form>
    ) : (
      <Button variant="primary" disabled={pending} onClick={() => decide(true)}>
        {pending ? "Connecting…" : "Allow"}
      </Button>
    );
  const Cancel =
    mode === "server" ? (
      <form action={denyConsent}>
        <input type="hidden" name="authorization_id" value={details.authorization_id} />
        <Button type="submit" variant="secondary">
          Cancel
        </Button>
      </form>
    ) : (
      <Button variant="secondary" disabled={pending} onClick={() => decide(false)}>
        Cancel
      </Button>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="display text-balance">Connect {app} to your dashboard?</h1>
        <p className="text-pretty text-body text-ink-2">
          You&apos;re signed in as <span className="font-semibold text-ink">{person.name}</span> ({person.email}).
        </p>
      </div>

      <p className="rounded-ctl bg-warn-soft px-3 py-2 text-ui font-semibold text-warn">Only continue if you started this from your own Claude a moment ago.</p>

      <div className="flex flex-col gap-2 text-ui text-ink-2">
        <p className="text-ink">If you allow it, {app} can:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-ink-3">
          <li>See and change what you can in the dashboard, and nothing more{person.is_admin ? ", including money and the team, since you're an admin" : ""}.</li>
          <li>Act under your name. Every change shows in the activity feed, marked &ldquo;via Claude&rdquo;.</li>
          {scopes.map((s) => (
            <li key={s}>{SCOPE_WORDS[s]}.</li>
          ))}
        </ul>
        <p className="pt-1">You can disconnect any time from the Agent tab, or remove the connector in Claude.</p>
        <p className="text-meta text-ink-3">It will send you back to {host}.</p>
      </div>

      {error ? (
        <p role="alert" className="rounded-ctl bg-crit-soft px-3 py-2 text-ui text-crit">
          {error}
        </p>
      ) : null}

      {trusted ? (
        <div className="flex gap-2">
          {Allow}
          {Cancel}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="rounded-ctl bg-crit-soft px-3 py-2 text-ui text-crit">
            This app isn&apos;t Claude ({host}), so it can&apos;t be connected. If you didn&apos;t start this yourself, close this tab.
          </p>
          <div>{Cancel}</div>
        </div>
      )}
    </div>
  );
}

/** Fallback when the server couldn't read the session: the browser asks Supabase itself, with the cookie it holds. */
export function ConsentInBrowser({ id, person, serverReason }: { id: string; person: Person; serverReason: string }) {
  const [state, setState] = useState<{ details?: ConsentDetails; reason?: string }>({});

  useEffect(() => {
    let live = true;
    createClient()
      .auth.oauth.getAuthorizationDetails(id)
      .then(({ data, error }) => {
        if (!live) return;
        if (error || !data) {
          const names = document.cookie
            .split(";")
            .map((c) => c.trim().split("=")[0])
            .filter((n) => n.startsWith("sb-"))
            .map((n) => n.replace(/^sb-[a-z0-9]+-/, ""));
          return setState({ reason: `${error?.message ?? "no details returned"} | browser cookies ${names.join(",") || "none"} | server: ${serverReason}` });
        }
        if ("redirect_url" in data) {
          if (trustedRedirect(data.redirect_url)) window.location.replace(data.redirect_url);
          else setState({ reason: "already decided for an app that isn't Claude" });
          return;
        }
        setState({ details: data });
      });
    return () => {
      live = false;
    };
  }, [id, serverReason]);

  if (state.details) return <ConsentView details={state.details} person={person} mode="browser" />;
  if (state.reason)
    return (
      <Problem title="This link isn't valid" reason={state.reason}>
        It may have expired or already been used. Start connecting again from Claude.
      </Problem>
    );
  return <p className="text-body text-ink-2">Checking the request…</p>;
}
