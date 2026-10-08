"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { inviteMember, resendInvite, setAdmin } from "@/actions/team";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { Pill } from "@/components/ui/badges";
import { ago, displayName } from "@/lib/format";

export type Member = {
  id: string;
  full_name: string;
  email: string;
  is_admin: boolean;
  status: "active" | "invited" | "unknown";
  last_sign_in_at: string | null;
};

export function InviteForm({ canInvite }: { canInvite: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof inviteMember>>, fd: FormData) => {
    const result = await inviteMember(prev, fd);
    if (result?.ok) formRef.current?.reset();
    return result;
  }, null);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
        <Field label="Name" htmlFor="invite-name">
          <Input id="invite-name" name="full_name" required disabled={!canInvite} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="invite-email">
          <Input id="invite-email" name="email" type="email" required disabled={!canInvite} autoComplete="off" placeholder="name@itnetai.com" />
        </Field>
        <Button type="submit" variant="primary" disabled={pending || !canInvite} className="h-9">
          {pending ? "Sending…" : "Send invite"}
        </Button>
      </div>
      <FormError message={state?.error} />
      {state?.ok ? <p className="text-ui text-good">{state.message}</p> : null}
    </form>
  );
}

export function MemberList({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string } | null>) =>
    startTransition(async () => {
      const r = await fn();
      setNotice(r?.error ? { tone: "error", text: r.error } : r?.message ? { tone: "ok", text: r.message } : null);
    });

  return (
    <div className="flex flex-col gap-2">
      {notice ? <p className={`text-ui ${notice.tone === "error" ? "text-crit" : "text-good"}`}>{notice.text}</p> : null}
      <ul>
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-2.5">
            <Avatar person={m} size={28} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium">
                {displayName(m)}
                {m.id === currentUserId ? <span className="font-normal text-ink-3"> (you)</span> : null}
              </span>
              <span className="truncate text-meta text-ink-3">{m.email}</span>
            </div>
            <div className="flex items-center gap-3 text-ui">
              {m.status === "invited" ? (
                <>
                  <Pill tone="warn">Invite pending</Pill>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resendInvite(m.email))}>
                    Resend
                  </Button>
                </>
              ) : m.last_sign_in_at ? (
                <span className="text-meta text-ink-3">Last in {ago(m.last_sign_in_at)}</span>
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 text-ui text-ink-2">
                <input
                  type="checkbox"
                  checked={m.is_admin}
                  disabled={pending || m.id === currentUserId}
                  onChange={(e) => run(() => setAdmin(m.id, e.target.checked))}
                  className="size-4 accent-[var(--accent)]"
                />
                Admin
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
