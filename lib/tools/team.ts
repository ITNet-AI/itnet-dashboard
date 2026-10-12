import "server-only";
import { z } from "zod";
import { authLink, linkEmail, sendEmail } from "@/lib/email";
import { defineTool, fail, id, ok } from "./define";

/** Supabase makes the invite link (and the account, the first time); Resend delivers it. */
async function sendInvite(email: string, inviter: string, fullName?: string) {
  const link = await authLink("invite", email, fullName ? { full_name: fullName } : undefined);
  if (link.error !== undefined) return link;
  const mail = linkEmail(
    "You're invited to the ITnet dashboard",
    [`${inviter} added you to the ITnet dashboard.`, "Open the link to set your password and sign in."],
    "Set your password",
    link.url,
  );
  return sendEmail(email, mail.subject, mail.html, mail.text);
}

const email = z.email("That email doesn't look right.").transform((e) => e.toLowerCase());

export const inviteMember = defineTool({
  name: "invite_member",
  description: "Email someone an invite to join the dashboard, optionally as an admin. They set their own password from the link. Admin only.",
  admin: true,
  input: z.object({
    full_name: z.string({ error: "Add their name." }).trim().min(1, "Add their name.").max(120),
    email,
    is_admin: z.boolean().default(false),
  }),
  async run({ supabase, user }, input) {
    const { error } = await sendInvite(input.email, user.full_name || user.email, input.full_name);
    if (error) return fail(/already/i.test(error) ? `${input.email} already has an account.` : error);
    if (input.is_admin) {
      // generateLink made the account, and the signup trigger its profile.
      const { error: flagError } = await supabase.from("profiles").update({ is_admin: true }).eq("email", input.email);
      if (flagError) return fail(`Invite sent, but couldn't make them an admin: ${flagError.message}`);
    }
    return ok({ email: input.email });
  },
});

export const resendInvite = defineTool({
  name: "resend_invite",
  description: "Send the invite email again to someone who hasn't joined yet. Admin only.",
  admin: true,
  input: z.object({ email }),
  async run({ user }, input) {
    const { error } = await sendInvite(input.email, user.full_name || user.email);
    if (error) return fail(error);
    return ok({ email: input.email });
  },
});

export const setAdmin = defineTool({
  name: "set_admin",
  description: "Give or remove admin access (money and team pages). You can't remove your own. Admin only.",
  admin: true,
  input: z.object({ id, is_admin: z.boolean() }),
  async run({ supabase, user }, input) {
    if (input.id === user.id && !input.is_admin) return fail("You can't remove your own admin access.");
    const { data, error } = await supabase.from("profiles").update({ is_admin: input.is_admin }).eq("id", input.id).select("id");
    if (error) return fail(error.message);
    if (!data.length) return fail("Person not found.");
    return ok({ id: input.id });
  },
});
