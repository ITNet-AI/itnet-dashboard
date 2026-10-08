-- itnet dashboard: initial schema
-- One role flag (profiles.is_admin). Money (costs) is admin-only at the database level.

create extension if not exists pgcrypto;

-- enums -----------------------------------------------------------------
create type public.project_status as enum ('active', 'paused', 'done');
create type public.task_status    as enum ('todo', 'doing', 'done');
create type public.cost_kind      as enum ('one_time', 'recurring');
create type public.cost_interval  as enum ('monthly', 'yearly');

-- profiles --------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- clients ---------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  contact_name  text,
  contact_email text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- projects --------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients (id) on delete set null,
  name        text not null check (length(trim(name)) > 0),
  description text,
  status      public.project_status not null default 'active',
  lead_id     uuid references public.profiles (id) on delete set null,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- tasks -----------------------------------------------------------------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  description text,
  status      public.task_status not null default 'todo',
  assignee_id uuid references public.profiles (id) on delete set null,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  due_date    date,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- comments --------------------------------------------------------------
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  constraint comments_one_parent check ((task_id is null) <> (project_id is null))
);

-- costs (one-time spend and subscriptions) ------------------------------
create table public.costs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete set null,
  name         text not null check (length(trim(name)) > 0),
  vendor       text,
  amount       numeric(12, 2) not null check (amount >= 0),
  currency     text not null default 'INR',
  kind         public.cost_kind not null default 'one_time',
  "interval"   public.cost_interval,
  next_renewal date,
  paid_on      date,
  active       boolean not null default true,
  notes        text,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  constraint costs_recurring_shape check (
    (kind = 'recurring' and "interval" is not null and next_renewal is not null)
    or (kind = 'one_time' and "interval" is null)
  )
);

-- activity (append-only log; also the future agent feed) ----------------
create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  entity_type text not null check (entity_type in ('project', 'task', 'client', 'comment')),
  entity_id   uuid not null,
  project_id  uuid references public.projects (id) on delete cascade,
  action      text not null,
  summary     text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- indexes ---------------------------------------------------------------
create index tasks_board_idx     on public.tasks (project_id, status, position);
create index tasks_assignee_idx  on public.tasks (assignee_id, status);
create index projects_lead_idx   on public.projects (lead_id);
create index projects_client_idx on public.projects (client_id);
create index comments_task_idx    on public.comments (task_id, created_at);
create index comments_project_idx on public.comments (project_id, created_at);
create index costs_renewal_idx    on public.costs (next_renewal) where kind = 'recurring' and active;
create index costs_project_idx    on public.costs (project_id);
create index activity_recent_idx  on public.activity (created_at desc);
create index activity_project_idx on public.activity (project_id, created_at desc);
create index activity_actor_idx   on public.activity (actor_id);
create index tasks_created_by_idx on public.tasks (created_by);
create index comments_author_idx  on public.comments (author_id);
create index costs_created_by_idx on public.costs (created_by);

-- helpers ---------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- service role (no auth.uid) may change anything
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'Only admins can change admin access';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Email is managed by sign-in';
  end if;
  return new;
end;
$$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- row level security ----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients  enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.comments enable row level security;
alter table public.costs    enable row level security;
alter table public.activity enable row level security;

-- profiles
create policy "profiles: team can read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: self or admin can update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- clients
create policy "clients: team can read" on public.clients
  for select to authenticated using (true);
create policy "clients: team can add" on public.clients
  for insert to authenticated with check (true);
create policy "clients: team can edit" on public.clients
  for update to authenticated using (true) with check (true);
create policy "clients: admin can delete" on public.clients
  for delete to authenticated using ((select public.is_admin()));

-- projects
create policy "projects: team can read" on public.projects
  for select to authenticated using (true);
create policy "projects: team can add" on public.projects
  for insert to authenticated with check (true);
create policy "projects: team can edit" on public.projects
  for update to authenticated using (true) with check (true);
create policy "projects: admin can delete" on public.projects
  for delete to authenticated using ((select public.is_admin()));

-- tasks
create policy "tasks: team can read" on public.tasks
  for select to authenticated using (true);
create policy "tasks: team can add" on public.tasks
  for insert to authenticated with check (true);
create policy "tasks: team can edit" on public.tasks
  for update to authenticated using (true) with check (true);
create policy "tasks: team can delete" on public.tasks
  for delete to authenticated using (true);

-- comments
create policy "comments: team can read" on public.comments
  for select to authenticated using (true);
create policy "comments: author posts as self" on public.comments
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "comments: author can edit" on public.comments
  for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "comments: author or admin can delete" on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- costs: admin only, every operation
create policy "costs: admin only" on public.costs
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- activity: append-only
create policy "activity: team can read" on public.activity
  for select to authenticated using (true);
create policy "activity: log as self" on public.activity
  for insert to authenticated with check (actor_id = (select auth.uid()));

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin() is only meaningful for signed-in users
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
