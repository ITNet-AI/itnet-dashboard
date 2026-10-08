import type { Metadata } from "next";
import { InviteForm, MemberList, type Member } from "@/components/team/team";
import { PageHeader, Section } from "@/components/ui/page";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  // Sign-in state lives in auth, which needs the secret key. Without it the page still lists people.
  const canInvite = Boolean(process.env.SUPABASE_SECRET_KEY);
  const authById = new Map<string, { confirmed: boolean; last: string | null }>();
  if (canInvite) {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 200 });
    for (const u of data?.users ?? []) {
      authById.set(u.id, { confirmed: Boolean(u.last_sign_in_at || u.email_confirmed_at), last: u.last_sign_in_at ?? null });
    }
  }

  const members: Member[] = (profiles ?? []).map((p) => {
    const a = authById.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_admin: p.is_admin,
      status: !a ? "unknown" : a.last ? "active" : "invited",
      last_sign_in_at: a?.last ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Team"
        figure={members.length}
        meta={<p className="text-body text-ink-2">Admins can see Money and this page, and can delete projects and clients.</p>}
      />
      <div className="flex flex-col gap-10">
        <Section title="Invite someone">
          <div className="pt-4">
            {canInvite ? null : (
              <p className="mb-3 rounded-ctl bg-warn-soft px-3 py-2 text-ui text-warn">
                Invites need the Supabase secret key. Add SUPABASE_SECRET_KEY to .env.local and restart the app.
              </p>
            )}
            <InviteForm canInvite={canInvite} />
            <p className="pt-2 text-meta text-ink-3">They get an email with a link to set their password.</p>
          </div>
        </Section>
        <Section title="People" count={members.length}>
          <MemberList members={members} currentUserId={me.id} />
        </Section>
      </div>
    </>
  );
}
