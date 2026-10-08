import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { defineTool, fail, id, ok } from "./define";

function redirectTo() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${site}/auth/confirm?next=/set-password`;
}

const email = z.email("That email doesn't look right.").transform((e) => e.toLowerCase());

export const inviteMember = defineTool({
  name: "invite_member",
  description: "Email someone an invite to join the dashboard. They set their own password from the link. Admin only.",
  admin: true,
  input: z.object({
    full_name: z.string({ error: "Add their name." }).trim().min(1, "Add their name.").max(120),
    email,
  }),
  async run(_, input) {
    const { error } = await createAdminClient().auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.full_name },
      redirectTo: redirectTo(),
    });
    if (error) return fail(/already/i.test(error.message) ? `${input.email} already has an account.` : error.message);
    return ok({ email: input.email });
  },
});

export const resendInvite = defineTool({
  name: "resend_invite",
  description: "Send the invite email again to someone who hasn't joined yet. Admin only.",
  admin: true,
  input: z.object({ email }),
  async run(_, input) {
    const { error } = await createAdminClient().auth.admin.inviteUserByEmail(input.email, { redirectTo: redirectTo() });
    if (error) return fail(error.message);
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
