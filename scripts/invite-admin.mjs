// Invites the first admin. Run once:  pnpm invite-admin you@itnetai.com "Your Name"
import { createClient } from "@supabase/supabase-js";

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ");
if (!email || !fullName) {
  console.error('Usage: pnpm invite-admin you@itnetai.com "Your Name"');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
  data: { full_name: fullName },
  redirectTo: `${site}/auth/confirm?next=/set-password`,
});
if (error) {
  console.error("Invite failed:", error.message);
  process.exit(1);
}
const { error: flagError } = await admin.from("profiles").update({ is_admin: true }).eq("id", data.user.id);
if (flagError) {
  console.error("Invited, but could not make admin:", flagError.message);
  process.exit(1);
}
console.log(`Invite sent to ${email}. They are an admin.`);
