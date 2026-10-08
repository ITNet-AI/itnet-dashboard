-- A task's creator is whoever created it. Without this, a member (or their agent calling the API directly)
-- could add or rewrite tasks to look like someone else made them.
drop policy "tasks: team can add" on public.tasks;
create policy "tasks: team can add as self" on public.tasks
  for insert to authenticated with check (created_by = (select auth.uid()));

create or replace function public.protect_task_creator()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.created_by is distinct from old.created_by then
    raise exception 'A task''s creator can''t be changed';
  end if;
  return new;
end;
$$;

create trigger tasks_protect_creator
  before update on public.tasks
  for each row execute function public.protect_task_creator();
