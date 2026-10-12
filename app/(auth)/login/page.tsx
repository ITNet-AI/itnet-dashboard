import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  const connecting = typeof next === "string" && next.startsWith("/oauth/consent");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="display">Sign in</h1>
        <p className="text-pretty text-body text-ink-2">
          {connecting ? "Sign in to connect Claude to your dashboard account." : "Accounts are by invite. Ask an admin if you don't have one."}
        </p>
      </div>
      {error === "link" ? (
        <p className="rounded-ctl bg-warn-soft px-3 py-2 text-ui text-warn">
          That link has expired or was already used. Sign in, or ask an admin to resend your invite.
        </p>
      ) : null}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </div>
  );
}
