-- Agent chats. One row per thread, owned by the person who started it; nobody else can read it, admins included.
-- messages holds the AI SDK's UIMessage list, so a thread resumes exactly, tool cards and pending approvals included.
create table public.agent_threads (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null default 'New chat',
  messages    jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index agent_threads_owner_idx on public.agent_threads (owner_id, updated_at desc);

alter table public.agent_threads enable row level security;
create policy "agent threads: owner only" on public.agent_threads
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
