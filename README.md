# itnet dashboard

Internal tool for the itnet team: projects, tasks, clients, and money (costs and subscriptions).
Next.js 16, Tailwind 4, Supabase (Postgres, auth, row level security).

## What's in it

- **Home.** Your tasks by due date, projects you lead, team activity. Admins also see headline numbers, every active project, and renewals in the next 30 days.
- **Projects.** List with progress. Each project has a lead, a board (To do, In progress, Done), a discussion thread, and, for admins, its costs.
- **Tasks.** Everything assigned to you, created by you, or everyone's. Anyone can assign anyone.
- **Clients.** Contacts, notes, and their projects.
- **Money** (admin). Subscriptions and one-time expenses in rupees. Renewal dates roll forward on their own.
- **Team** (admin). Invite people by email and choose who is an admin.

Every task opens at a stable link (`/projects/<id>?task=<id>`), and every change is written to an `activity` table. Both are there so agents can read, update and link to the same data later.

## Access rules

There is one role flag, `profiles.is_admin`. The database enforces it, not just the UI:

- Everyone signed in can read and edit projects, tasks, clients and comments.
- Only admins can see or change costs, delete projects or clients, or change who is an admin.
- Costs are never written to the activity log, because everyone can read the log.
- Comments, activity and task creators are always the signed-in person; nobody can post as someone else.

## Tools (for agents)

Every write the app can make is a named tool in `lib/tools/`, plus read tools (`lib/tools/reads.ts`) so an
agent can find ids and see what's due. Each has a zod input schema, a description for agents, an admin flag,
and reads are marked `readOnly`. The registry is `tools` in `lib/tools/index.ts`. The server actions in
`actions/` only turn form fields into tool input, so the app and a future MCP share one code path.

Who is acting is never part of a tool's input. It comes from the caller's credential:
`contextFromAccessToken(token)` turns a person's Supabase access token into a context, and every query
then runs as them under row level security. A member's agent can do exactly what that member can, and
nothing that needs admin.

## Setup

1. **Secret key.** Supabase dashboard, Project settings, API keys. Copy a secret key into `.env.local` as `SUPABASE_SECRET_KEY`. It is server only and never committed.
2. **Turn off public sign-ups.** Authentication, Sign In / Providers, Email: switch off "Allow new users to sign up".
3. **Redirect URLs.** Authentication, URL Configuration: set Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to Redirect URLs. Add your production domain when you deploy.
4. **Email delivery.** Supabase's built-in mailer only reaches a handful of addresses per hour. Create a Resend account, verify your domain, and paste its SMTP details into Authentication, Emails, SMTP Settings.
5. **First admin.**
   ```
   pnpm install
   pnpm invite-admin dev@itnetai.com "Your Name"
   ```
   Open the email, set a password, and invite the rest of the team from the Team page.
6. **Run it.**
   ```
   pnpm dev
   ```

Optional: in Authentication, Emails, change the "Reset password" template's link to
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password`.
Then reset links work even when opened on a different device from the one that asked for them.

## Locked out

If someone forgets their password and reset emails are rate limited, run this in your own terminal:

```
pnpm set-password name@itnetai.com
```

It asks for the new password at a hidden prompt and sets it directly with the secret key.

## Database

The schema lives in `supabase/migrations/` and every file there has been applied to the project.
After changing it, regenerate types:

```
supabase gen types typescript --project-id xbslkwattmhcttuwtwfo > lib/database.types.ts
```

## Layout

```
app/(auth)        sign in, reset, set password
app/(app)         signed-in pages; layout holds the sidebar
app/auth          email link handlers
actions/          server actions: form fields in, tool call out; each re-checks the session
lib/tools/        every read and write as an agent-callable tool, plus the registry
components/ui     hand-rolled primitives on the design tokens in app/globals.css
lib/              Supabase clients, auth, queries, dates, money maths
```

Cache Components is turned off in `next.config.ts`. Every page reads the session, so there is no static shell to gain.
