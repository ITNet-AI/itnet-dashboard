# itnet dashboard

Internal tool for the itnet team: projects, tasks, clients, and money (costs and subscriptions).
Next.js 16, Tailwind 4, Supabase (Postgres, auth, row level security).

## What's in it

- **Home.** Your tasks by due date, projects you lead, team activity. Admins also see headline numbers, every active project, and renewals in the next 30 days.
- **Projects.** List with progress. Each project has a lead, a board (To do, In progress, Done), a discussion thread, and, for admins, its costs. When the work is done, a project moves to Billing with a fee, then to Paid once the money is in.
- **Tasks.** Everything assigned to you, created by you, or everyone's. Anyone can assign anyone.
- **Clients.** Contacts, notes, and their projects.
- **Money** (admin). Projects awaiting payment with a Collected button, then subscriptions and one-time expenses in rupees. Renewal dates roll forward on their own.
- **Team** (admin). Invite people by email and choose who is an admin.

Every task opens at a stable link (`/projects/<id>?task=<id>`), and every change is written to an `activity` table. Both are there so agents can read, update and link to the same data later.

## Agent

The first tab is a chat with Claude that works through the same tools as the app. Ask "what's overdue?" or say
"add a task to Fleet tracking app for Dev, due Friday" and it looks up the ids, makes the change, and links it.

- It acts as you. Tools run with your session under row level security, and admin-only tools are not even offered to
  members, so it can do exactly what you can and nothing more. Everything it changes is in the activity feed under
  your name, marked "via the agent".
- Deleting anything and changing admin access wait for you to press Delete or Approve in the chat. Approval requests
  are signed on the server, so a client can't forge one.
- Chats are saved per person in `agent_threads` and nobody else can read them, admins included.
- Text in tasks, comments and notes reaches the model as data. Someone could write an instruction there; the agent is
  told to ignore it, and even if it didn't, it could only do what you could, with deletes still waiting for a click.

Set `ANTHROPIC_API_KEY` in `.env.local` and in Vercel. If the key isn't scoped to a workspace, also set
`ANTHROPIC_WORKSPACE_ID`. Optional: `AGENT_MODEL` (default `claude-sonnet-5-5`).
The route stops at 60 seconds and twelve tool steps per message, which fits Vercel's Hobby plan.

## Use from Claude (MCP connector)

People can add the dashboard to claude.ai (web, desktop or phone) as a custom connector, then ask or act from any Claude
chat. It is the same set of tools as the Agent tab, served over MCP at `/api/mcp`, and it acts as the person who
connected it: members get member tools, admins get everything, and every change shows in the activity feed marked
"via Claude". The Agent tab's "Use from Claude" button shows the address, the steps, and a Disconnect list.

How sign-in works: Supabase Auth is the OAuth 2.1 server. Claude registers itself, sends the person to
`/oauth/consent` on this site, and gets a short-lived Supabase token after they press Allow. `/api/mcp` accepts only
tokens Supabase issued to an OAuth client (signature, expiry, issuer, role and a `client_id` claim are all checked),
so a dashboard session token or an API key is refused. The consent page only approves apps that send people back to
`claude.ai` or `claude.com`.

One-time setup in the Supabase dashboard:

1. Authentication, URL Configuration: Site URL = `https://itnet-dashboard.vercel.app`.
2. Authentication, OAuth Server: enable it, set the authorization path to `/oauth/consent`, and allow dynamic OAuth apps.

Optional env vars: `MCP_OAUTH_CLIENT_IDS` (comma-separated) pins which OAuth clients may connect, and
`MCP_DISABLED=1` switches the connector off without a deploy. Turning off the OAuth server in Supabase does the same.

Things to know:

- Supabase's OAuth server is in beta. Its tokens are not bound to `/api/mcp` as an audience, so the `client_id`
  check stands in for that. Revisit if another OAuth app ever shares this Supabase project.
- Removing someone's admin flag takes effect on their next call, because the profile is read on every request.
- Someone could start a connection in their own Claude and send you the consent link. The page says to continue only
  if you started it yourself; that warning is the only defence, so take it seriously.

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
4. **Email delivery.** The app sends invite and password-reset emails itself through Resend, from `info@itnetai.com`. Verify `itnetai.com` in Resend, then put a sending key in `.env.local` (and Vercel) as `RESEND_API_KEY`.
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

## Locked out

If someone forgets their password and reset emails are rate limited, run this in your own terminal:

```
pnpm set-password name@itnetai.com
```

It asks for the new password at a hidden prompt and sets it directly with the secret key.

## Database

The project is in Supabase's Mumbai region (`ap-south-1`), the closest to the team. The schema lives in
`supabase/migrations/`. To apply new migrations, link once and push:

```
supabase link --project-ref pytuwcbtylectoipbjfw
supabase db push
supabase db push --include-seed      # also loads the demo data from supabase/demo-data.sql
```

After changing the schema, regenerate types:

```
supabase gen types typescript --project-id pytuwcbtylectoipbjfw > lib/database.types.ts
```

`supabase/demo-data-remove.sql` deletes exactly the demo rows when you want a clean slate.

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
