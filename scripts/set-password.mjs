// Sets a new password for an account without email. For when someone is locked out and reset emails are rate limited.
// Run in your own terminal:  pnpm set-password you@itnetai.com
// The password is typed at a hidden prompt, so it never lands in shell history or logs.
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("Usage: pnpm set-password you@itnetai.com");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
if (!process.stdin.isTTY) {
  console.error("Run this in your own terminal so the password can be typed privately.");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: profile, error: findError } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
if (findError || !profile) {
  console.error(`No account found for ${email}.`);
  process.exit(1);
}

const password = await askHidden("New password (at least 8 characters): ");
if (password.length < 8) {
  console.error("Use at least 8 characters. Nothing was changed.");
  process.exit(1);
}
const confirm = await askHidden("Type it again: ");
if (password !== confirm) {
  console.error("The two passwords don't match. Nothing was changed.");
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
if (error) {
  console.error("Could not set the password:", error.message);
  process.exit(1);
}
console.log(`Password updated for ${email}. Sign in with it now.`);
