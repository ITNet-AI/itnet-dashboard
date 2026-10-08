import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="display">Reset password</h1>
        <p className="text-body text-ink-2">We&apos;ll email you a link to set a new one.</p>
      </div>
      <ForgotForm />
    </div>
  );
}
