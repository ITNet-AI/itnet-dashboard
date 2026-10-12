"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { GLYPH, Icon } from "@/components/ui/icons";
import type { ThreadSummary } from "@/lib/agent/threads";
import { Message } from "./message";
import { ThreadList } from "./thread-list";

type Me = { full_name: string; email: string; is_admin: boolean };

const STARTERS = [
  "What's overdue?",
  "What has the team done since yesterday?",
  "Who has nothing assigned right now?",
  "Add a task to … for … due Friday",
];
const ADMIN_STARTERS = ["What's waiting on payment?", "What renews this week?"];

/** Turns the route's JSON error body into a sentence. */
function errorText(error: Error) {
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
  } catch {
    return error.message || "Something went wrong. Try again.";
  }
}

export function AgentChat({
  thread,
  threads,
  user,
  configured,
}: {
  thread: { id: string; messages: UIMessage[] };
  threads: ThreadSummary[];
  user: Me;
  configured: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [chatsOpen, setChatsOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, error, clearError, addToolApprovalResponse } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport: new DefaultChatTransport({ api: "/api/agent" }),
    // Approvals are answered in the chat; once every pending one has an answer, the turn carries on by itself.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    // Refresh the server-rendered parts: the thread's title in the list, and the sidebar and pages if anything changed.
    onFinish: () => router.refresh(),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const value = text.trim();
    if (!value || busy || !configured) return;
    clearError();
    sendMessage({ text: value });
    setDraft("");
    inputRef.current?.focus();
  }

  const starters = [...STARTERS, ...(user.is_admin ? ADMIN_STARTERS : [])];

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[208px_minmax(0,1fr)]">
      <aside className="hidden md:block">
        <div className="sticky top-9">
          <ThreadList threads={threads} activeId={thread.id} />
        </div>
      </aside>

      <section className="flex min-h-[calc(100dvh-9rem)] min-w-0 flex-col md:min-h-[calc(100dvh-4.5rem)]">
        <header className="flex items-center justify-between gap-4 pb-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="display">Agent</h1>
            <p className="text-ui text-ink-2">Ask, or tell it what to change. It works as you, with your access, and logs everything under your name.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <Button variant="secondary" size="sm" onClick={() => setChatsOpen(true)}>
              Chats
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 pb-6" aria-live="polite">
          {messages.length === 0 ? (
            <div className="flex flex-col gap-4 rounded-dlg border border-dashed border-line-2 px-5 py-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18}>{GLYPH.sparkle}</Icon>
                </span>
                <div className="flex flex-col">
                  <span className="text-body font-semibold">What do you need?</span>
                  <span className="text-ui text-ink-2">It can look things up, add and assign tasks, move work along and more.</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!configured}
                    onClick={() => (s.includes("…") ? (setDraft(s), inputRef.current?.focus()) : send(s))}
                    className="h-8 rounded-full border border-line-2 bg-surface px-3 text-ui text-ink-2 hover:border-ink-3 hover:text-ink disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <Message key={m.id} message={m} user={user} onApprove={addToolApprovalResponse} busy={busy} />)
          )}

          {status === "submitted" ? (
            <div className="flex items-center gap-3 text-ui text-ink-3">
              <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon size={14}>{GLYPH.sparkle}</Icon>
              </span>
              <span className="motion-safe:animate-pulse">Thinking…</span>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-ctl bg-crit-soft px-3 py-2 text-ui text-crit">
              {errorText(error)}
            </p>
          ) : null}
          {!configured ? (
            <p className="rounded-ctl bg-warn-soft px-3 py-2 text-ui text-warn">
              The agent isn&apos;t set up yet. Add ANTHROPIC_API_KEY to the environment and redeploy.
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          className="sticky bottom-14 -mx-1 flex flex-col gap-1.5 bg-surface px-1 pb-3 pt-2 md:bottom-0 md:pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <div className="flex items-end gap-2 rounded-dlg border border-line-2 bg-surface p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
            <label htmlFor="agent-input" className="sr-only">
              Message the agent
            </label>
            <textarea
              id="agent-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={configured ? "Ask or tell the agent…" : "Agent not set up yet"}
              disabled={!configured}
              className="max-h-48 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-body text-ink placeholder:text-ink-3 focus:outline-none [field-sizing:content]"
            />
            {busy ? (
              <Button variant="secondary" size="sm" onClick={() => stop()}>
                Stop
              </Button>
            ) : (
              <Button type="submit" variant="primary" size="sm" disabled={!draft.trim() || !configured}>
                Send
              </Button>
            )}
          </div>
          <p className="px-1 text-meta text-ink-3">Enter to send, Shift+Enter for a new line. Deletes and admin changes wait for your OK.</p>
        </form>
      </section>

      <Dialog open={chatsOpen} onClose={() => setChatsOpen(false)} title="Chats">
        <ThreadList threads={threads} activeId={thread.id} onNavigate={() => setChatsOpen(false)} />
      </Dialog>
    </div>
  );
}
