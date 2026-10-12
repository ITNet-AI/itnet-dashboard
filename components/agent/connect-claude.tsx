"use client";

import { useState, useTransition } from "react";
import { disconnect, listConnections } from "@/actions/oauth";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ago } from "@/lib/format";

type Connection = Awaited<ReturnType<typeof listConnections>>[number];

/** How to add the dashboard to claude.ai, and the apps already connected, each with a Disconnect button. */
export function ConnectClaude({ serverUrl }: { serverUrl: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function load() {
    start(async () => setConnections(await listConnections()));
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
          load();
        }}
      >
        Use from Claude
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Use the dashboard from Claude">
        <div className="flex flex-col gap-5 text-ui">
          <p className="text-body text-ink-2">
            Add the dashboard to claude.ai as a connector and ask or act from any Claude chat, on the web, desktop or phone. It works as you, with your
            access, just like this tab.
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="font-semibold">Connector address</span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-ctl border border-line-2 bg-sunk px-2.5 py-1.5 text-ui">{serverUrl}</code>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(serverUrl).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-ink-2 marker:text-ink-3">
            <li>In claude.ai, open Settings, then Connectors, and choose Add custom connector.</li>
            <li>Name it ITNET, paste the address above, and leave the advanced settings empty.</li>
            <li>Press Connect, sign in here if asked, and choose Allow.</li>
            <li>Keep the tools that change things on &ldquo;Needs approval&rdquo; in Claude, so it asks before acting.</li>
          </ol>

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <span className="font-semibold">Connected</span>
            {connections === null ? (
              <span className="text-ink-3">Checking…</span>
            ) : connections.length === 0 ? (
              <span className="text-ink-3">Nothing connected yet.</span>
            ) : (
              <ul className="flex flex-col">
                {connections.map((c) => (
                  <li key={c.clientId} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{c.name}</span>
                      <span className="text-meta text-ink-3">Connected {ago(c.grantedAt)}</span>
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await disconnect(c.clientId);
                          if (r.error) setError(r.error);
                          setConnections(await listConnections());
                        })
                      }
                    >
                      Disconnect
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {error ? <p className="text-meta text-crit">{error}</p> : null}
          </div>
        </div>
      </Dialog>
    </>
  );
}
