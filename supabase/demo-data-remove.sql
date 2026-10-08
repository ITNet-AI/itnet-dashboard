-- Removes only the demo rows (ids starting with "de000"). Real data is untouched.
delete from public.activity where id::text like 'de000%';
delete from public.costs    where id::text like 'de000%';
delete from public.comments where id::text like 'de000%';
delete from public.tasks    where id::text like 'de000%';
delete from public.projects where id::text like 'de000%';
delete from public.clients  where id::text like 'de000%';
