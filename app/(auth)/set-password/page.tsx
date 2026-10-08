import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="display">Set your password</h1>
        <p className="text-body text-ink-2">You&apos;ll sign in as {user.email}.</p>
      </div>
      <SetPasswordForm name={user.full_name} />
    </div>
  );
}
