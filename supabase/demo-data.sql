-- Demo data for a look around. Every id starts with "de000" so supabase/demo-data-remove.sql can delete exactly these rows.
-- Dates are relative to today. Tasks go to the first admin or stay unassigned.
do $$
declare
  me uuid := (select id from public.profiles where is_admin order by created_at limit 1);
  d date := current_date;
begin
  insert into public.clients (id, name, contact_name, contact_email, notes) values
    ('de000001-0000-4000-8000-000000000001', 'Vahan Logistics', 'Rahul Pillai', 'rahul@vahan.example', 'Weekly call on Mondays. Invoices net 30, raised on the 1st.'),
    ('de000001-0000-4000-8000-000000000002', 'Kerala Tourism', 'Anjali Varma', 'anjali@ktdc.example', 'Prefers WhatsApp for quick approvals. Content freeze before festival season.'),
    ('de000001-0000-4000-8000-000000000003', 'Medway Clinics', 'Dr. Suresh Kumar', 'suresh@medway.example', null);

  insert into public.projects (id, client_id, name, description, status, lead_id, due_date) values
    ('de000002-0000-4000-8000-000000000001', 'de000001-0000-4000-8000-000000000001', 'Fleet tracking app', 'Driver app and dispatcher dashboard for 400 trucks. Live location, trip history, check-ins.', 'active', me, d + 22),
    ('de000002-0000-4000-8000-000000000002', 'de000001-0000-4000-8000-000000000002', 'Tourism site rebuild', 'New marketing site with destination pages and an events calendar in English and Malayalam.', 'active', me, d + 5),
    ('de000002-0000-4000-8000-000000000003', null, 'Brand refresh', 'New logo lockups, type and a short brand guide for itnet.', 'paused', me, null),
    ('de000002-0000-4000-8000-000000000004', 'de000001-0000-4000-8000-000000000003', 'Clinic booking MVP', 'Appointment booking with SMS reminders for three clinics.', 'done', me, d - 12);

  insert into public.tasks (id, project_id, title, description, status, assignee_id, created_by, due_date, position) values
    ('de000003-0000-4000-8000-000000000001', 'de000002-0000-4000-8000-000000000001', 'Driver onboarding flow, final copy', 'Rahul wants the language toggle on the first screen.', 'todo', me, me, d + 3, 1024),
    ('de000003-0000-4000-8000-000000000002', 'de000002-0000-4000-8000-000000000001', 'Map clustering above 500 pins', null, 'todo', null, me, d + 9, 2048),
    ('de000003-0000-4000-8000-000000000003', 'de000002-0000-4000-8000-000000000001', 'Pick a push notification provider', 'Compare FCM direct vs OneSignal on cost at 400 devices.', 'todo', null, me, null, 3072),
    ('de000003-0000-4000-8000-000000000004', 'de000002-0000-4000-8000-000000000001', 'Trip history API pagination', null, 'doing', me, me, d, 1024),
    ('de000003-0000-4000-8000-000000000005', 'de000002-0000-4000-8000-000000000001', 'Offline mode for check-in', 'Queue check-ins in SQLite and sync when back online.', 'doing', null, me, d - 2, 2048),
    ('de000003-0000-4000-8000-000000000006', 'de000002-0000-4000-8000-000000000001', 'Dispatcher dashboard wireframes', null, 'done', me, me, d - 6, 1024),
    ('de000003-0000-4000-8000-000000000007', 'de000002-0000-4000-8000-000000000001', 'Login with OTP', null, 'done', me, me, d - 10, 2048),
    ('de000003-0000-4000-8000-000000000008', 'de000002-0000-4000-8000-000000000002', 'Destination page template', null, 'doing', me, me, d + 1, 1024),
    ('de000003-0000-4000-8000-000000000009', 'de000002-0000-4000-8000-000000000002', 'Malayalam translations for home page', 'Waiting on Anjali for the final copy.', 'todo', null, me, d + 4, 1024),
    ('de000003-0000-4000-8000-000000000010', 'de000002-0000-4000-8000-000000000002', 'Events calendar import from sheet', null, 'todo', me, me, d - 1, 2048),
    ('de000003-0000-4000-8000-000000000011', 'de000002-0000-4000-8000-000000000002', 'Lighthouse pass on mobile', null, 'todo', me, me, d + 14, 3072),
    ('de000003-0000-4000-8000-000000000012', 'de000002-0000-4000-8000-000000000002', 'Hosting and DNS cutover plan', null, 'done', me, me, d - 3, 1024),
    ('de000003-0000-4000-8000-000000000013', 'de000002-0000-4000-8000-000000000003', 'Logo lockup options', null, 'doing', me, me, null, 1024),
    ('de000003-0000-4000-8000-000000000014', 'de000002-0000-4000-8000-000000000003', 'Brand guide outline', null, 'todo', null, me, null, 1024),
    ('de000003-0000-4000-8000-000000000015', 'de000002-0000-4000-8000-000000000004', 'SMS reminder templates', null, 'done', me, me, d - 15, 1024),
    ('de000003-0000-4000-8000-000000000016', 'de000002-0000-4000-8000-000000000004', 'Handover call with clinic staff', null, 'done', me, me, d - 12, 2048);

  insert into public.comments (id, task_id, project_id, author_id, body, created_at) values
    ('de000004-0000-4000-8000-000000000001', 'de000003-0000-4000-8000-000000000005', null, me, 'SQLite queue works on Android. iOS background sync is still flaky, testing again tonight.', now() - interval '48 minutes'),
    ('de000004-0000-4000-8000-000000000002', 'de000003-0000-4000-8000-000000000004', null, me, 'Going with cursor pagination on trip start time. Page size 50.', now() - interval '3 hours'),
    ('de000004-0000-4000-8000-000000000003', null, 'de000002-0000-4000-8000-000000000001', me, 'Rahul confirmed the 30th for the pilot with 20 drivers. Everything else can slip to phase two.', now() - interval '1 day'),
    ('de000004-0000-4000-8000-000000000004', null, 'de000002-0000-4000-8000-000000000002', me, 'Anjali sends the festival copy by Friday. Calendar import has to land before that.', now() - interval '5 hours');

  insert into public.costs (id, project_id, name, vendor, amount, kind, "interval", next_renewal, paid_on, active, notes) values
    ('de000005-0000-4000-8000-000000000001', null, 'Figma Professional, 4 seats', 'Figma', 6400, 'recurring', 'monthly', d + 4, null, true, 'Billed to the company card ending 4021.'),
    ('de000005-0000-4000-8000-000000000002', null, 'Vercel Pro', 'Vercel', 1700, 'recurring', 'monthly', d + 11, null, true, null),
    ('de000005-0000-4000-8000-000000000003', 'de000002-0000-4000-8000-000000000001', 'Supabase Pro', 'Supabase', 2100, 'recurring', 'monthly', d + 19, null, true, null),
    ('de000005-0000-4000-8000-000000000004', null, 'Google Workspace, 8 users', 'Google', 9360, 'recurring', 'monthly', d + 23, null, true, null),
    ('de000005-0000-4000-8000-000000000005', null, 'Linear', 'Linear', 24000, 'recurring', 'yearly', d + 140, null, true, null),
    ('de000005-0000-4000-8000-000000000006', null, 'Notion Plus', 'Notion', 800, 'recurring', 'monthly', d - 40, null, false, 'Cancelled after moving docs here.'),
    ('de000005-0000-4000-8000-000000000007', 'de000002-0000-4000-8000-000000000001', 'Test devices, 2 Android phones', 'Croma', 31998, 'one_time', null, null, d - 3, true, null),
    ('de000005-0000-4000-8000-000000000008', null, 'Domain renewal itnetai.com', 'GoDaddy', 1299, 'one_time', null, null, d - 21, true, null),
    ('de000005-0000-4000-8000-000000000009', 'de000002-0000-4000-8000-000000000002', 'Stock photos, 30 images', 'Shutterstock', 7500, 'one_time', null, null, d - 1, true, null);

  insert into public.activity (id, actor_id, entity_type, entity_id, project_id, action, summary, meta, created_at) values
    ('de000006-0000-4000-8000-000000000001', me, 'task', 'de000003-0000-4000-8000-000000000004', 'de000002-0000-4000-8000-000000000001', 'moved', 'moved “Trip history API pagination” to In progress', '{"demo":true}', now() - interval '6 minutes'),
    ('de000006-0000-4000-8000-000000000002', me, 'comment', 'de000004-0000-4000-8000-000000000001', 'de000002-0000-4000-8000-000000000001', 'commented', 'commented on “Offline mode for check-in”', '{"demo":true,"task_id":"de000003-0000-4000-8000-000000000005","excerpt":"SQLite queue works on Android. iOS background sync is still flaky, testing again tonight."}', now() - interval '48 minutes'),
    ('de000006-0000-4000-8000-000000000003', me, 'task', 'de000003-0000-4000-8000-000000000008', 'de000002-0000-4000-8000-000000000002', 'assigned', 'picked up “Destination page template”', '{"demo":true}', now() - interval '3 hours'),
    ('de000006-0000-4000-8000-000000000004', me, 'comment', 'de000004-0000-4000-8000-000000000004', 'de000002-0000-4000-8000-000000000002', 'commented', 'commented on “Tourism site rebuild”', '{"demo":true,"excerpt":"Anjali sends the festival copy by Friday. Calendar import has to land before that."}', now() - interval '5 hours'),
    ('de000006-0000-4000-8000-000000000005', me, 'task', 'de000003-0000-4000-8000-000000000006', 'de000002-0000-4000-8000-000000000001', 'completed', 'finished “Dispatcher dashboard wireframes”', '{"demo":true}', now() - interval '26 hours'),
    ('de000006-0000-4000-8000-000000000006', me, 'project', 'de000002-0000-4000-8000-000000000002', 'de000002-0000-4000-8000-000000000002', 'created', 'started project “Tourism site rebuild”', '{"demo":true}', now() - interval '2 days'),
    ('de000006-0000-4000-8000-000000000007', me, 'project', 'de000002-0000-4000-8000-000000000004', 'de000002-0000-4000-8000-000000000004', 'updated', 'wrapped up “Clinic booking MVP”', '{"demo":true}', now() - interval '12 days');
end $$;
