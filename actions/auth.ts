"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text, type ActionState } from "@/lib/action-utils";
import { authLink, linkEmail, sendEmail } from "@/lib/email";
import { safeNext } from "@/lib/safe-next";

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = text(fd, "email");
  const password = text(fd, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match. Try again or reset your password." };
  // Back to where sign-in interrupted, such as approving the Claude connector. Same-origin paths only.
  redirect(safeNext(text(fd, "next"), process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = text(fd, "email");
  if (!email) return { error: "Enter the email you sign in with." };
  const link = await authLink("recovery", email.toLowerCase());
  // No link means no such account; say nothing different, so this can't be used to probe for accounts.
  if (link.error === undefined) {
    const mail = linkEmail(
      "Reset your ITnet password",
      ["Someone asked to reset the password for this account. If it was you, open the link to set a new one."],
      "Set a new password",
      link.url,
    );
    const { error } = await sendEmail(email, mail.subject, mail.html, mail.text);
    if (error) return { error };
  }
  return { ok: true, message: "If that email has an account, a reset link is on its way." };
}

export async function setPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = text(fd, "password");
  const confirm = text(fd, "confirm");
  if (!password || password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "This link has expired. Ask an admin to resend your invite." };

  const name = text(fd, "full_name");
  if (name) await supabase.from("profiles").update({ full_name: name }).eq("id", data.claims.sub);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/");
}
