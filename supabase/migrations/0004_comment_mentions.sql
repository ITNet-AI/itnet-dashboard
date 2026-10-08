-- People tagged in a comment with @Name. Stored as profile ids so renames don't lose the tag.
alter table public.comments add column mentions uuid[] not null default '{}';
create index comments_mentions_idx on public.comments using gin (mentions);
