-- A project moves on from done to billing, and from billing to paid once the client has settled up.
-- fee is what the client owes for the whole project, in rupees. billed_on and paid_on are stamped by the app.
alter type public.project_status add value 'billing';
alter type public.project_status add value 'paid';
alter table public.projects
  add column fee numeric(12,2) check (fee >= 0),
  add column billed_on date,
  add column paid_on date;
