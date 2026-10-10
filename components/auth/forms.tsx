"use client";

import Link from "@/components/ui/link";
import { useActionState } from "react";
import { requestPasswordReset, setPassword, signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state?.error} />
      <div className="flex items-center justify-between gap-4 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        <Link href="/forgot-password" className="text-ui text-ink-2 hover:text-ink">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">{state.message}</p>
        <Link href="/login" className="text-ui font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <FormError message={state?.error} />
      <div className="flex items-center justify-between gap-4 pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
        <Link href="/login" className="text-ui text-ink-2 hover:text-ink">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export function SetPasswordForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Your name" htmlFor="full_name" hint="This is how the team sees you on tasks and comments.">
        <Input id="full_name" name="full_name" defaultValue={name} autoComplete="name" required />
      </Field>
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Type it again" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormError message={state?.error} />
      <div className="pt-1">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </Button>
      </div>
    </form>
  );
}
