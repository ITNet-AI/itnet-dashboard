import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const FROM = "ITnet <info@itnetai.com>";

type LinkType = "invite" | "recovery";

/**
 * A one-time sign-in link for /auth/confirm, which verifies the token_hash and continues to /set-password.
 * Supabase makes the token; we send the email, so Supabase's own mailer (and its rate limit) is never used.
 */
export async function authLink(type: LinkType, email: string, data?: Record<string, unknown>) {
  const { data: link, error } = await createAdminClient().auth.admin.generateLink(
    type === "invite" ? { type, email, options: { data } } : { type, email },
  );
  if (error) return { error: error.message };
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({ token_hash: link.properties.hashed_token, type, next: "/set-password" });
  return { url: `${site}/auth/confirm?${params}` };
}

/** Sends through Resend. Returns an error message instead of throwing. */
export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: "RESEND_API_KEY is not set. Add it to .env.local to send email." };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (res.ok) return {};
  const body = await res.json().catch(() => null);
  return { error: `Email didn't send: ${body?.message ?? res.statusText}` };
}

/** Subject, HTML and plain-text bodies for a single-button email. */
export function linkEmail(heading: string, lines: string[], button: string, url: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:480px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>
${lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("\n")}
<p style="margin:24px 0"><a href="${esc(url)}" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${esc(button)}</a></p>
<p style="margin:0;font-size:13px;color:#666">The link works once. If you weren't expecting this, ignore it.</p>
</div>`;
  const text = `${heading}\n\n${lines.join("\n\n")}\n\n${button}: ${url}\n\nThe link works once. If you weren't expecting this, ignore it.`;
  return { subject: heading, html, text };
}
