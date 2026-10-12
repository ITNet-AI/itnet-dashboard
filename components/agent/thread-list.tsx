"use client";

import { useTransition } from "react";
import { deleteThread, newThread } from "@/actions/agent";
import { Button } from "@/components/ui/button";
import Link from "@/components/ui/link";
import type { ThreadSummary } from "@/lib/agent/threads";
import { ago } from "@/lib/format";

/** The person's chats, newest first, with New chat on top and delete on hover. */
export function ThreadList({ threads, activeId, onNavigate }: { threads: ThreadSummary[]; activeId: string; onNavigate?: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <form action={newThread}>
        <Button type="submit" variant="secondary" size="sm" className="w-full">
          New chat
        </Button>
      </form>
      <ul className="flex flex-col gap-0.5" aria-label="Chats">
        {threads.map((t) => {
          const active = t.id === activeId;
          return (
            <li key={t.id} className="group relative">
              <Link
                href={`/agent/${t.id}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col gap-0.5 rounded-ctl py-1.5 pl-2.5 pr-8 ${active ? "bg-sunk text-ink" : "text-ink-2 hover:bg-sunk hover:text-ink"}`}
              >
                <span className={`truncate text-ui ${active ? "font-semibold" : ""}`}>{t.title}</span>
                <span className="text-meta text-ink-3">{ago(t.updated_at)}</span>
              </Link>
              <button
                type="button"
                aria-label={`Delete chat ${t.title}`}
                disabled={pending}
                onClick={() => start(() => deleteThread(t.id, active))}
                className="absolute right-1 top-1.5 grid size-6 place-items-center rounded-ctl text-ink-3 opacity-0 hover:bg-surface hover:text-crit focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
