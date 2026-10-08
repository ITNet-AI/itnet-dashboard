-- Remembers when someone last opened Home, so the owner's Home can say what changed since then.
-- last_seen_at moves on every visit. digest_from moves only when a new session starts (2h+ gap),
-- so refreshing the page keeps the same "since" window.
alter table public.profiles
  add column last_seen_at timestamptz,
  add column digest_from timestamptz;
