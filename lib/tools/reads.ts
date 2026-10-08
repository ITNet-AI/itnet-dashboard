import "server-only";
import { z } from "zod";
import { summarize } from "@/lib/costs";
import { todayISO } from "@/lib/dates";
import { projectHealth } from "@/lib/health";
import { PERSON } from "@/lib/queries";
import { defineTool, fail, id, ok, optionalDate, taskStatus } from "./define";

// Reads for agents: enough to find ids and answer "what's on my plate". Each runs as the caller, so RLS still applies.

const TASK = `id, title, description, status, due_date, created_at, updated_at,
  project:projects(id, name), assignee:profiles!tasks_assignee_id_fkey(${PERSON}), creator:profiles!tasks_created_by_fkey(${PERSON})`;

export const whoami = defineTool({
  name: "whoami",
  description: "Who you are acting as, whether they are an admin, and today's date in the team's timezone (Asia/Kolkata).",
  readOnly: true,
  input: z.object({}),
  async run({ user }) {
    return ok({ id: user.id, full_name: user.full_name, email: user.email, is_admin: user.is_admin, today: todayISO() });
  },
});

export const listPeople = defineTool({
  name: "list_people",
  description: "Everyone on the team, with the ids used for assignee_id and lead_id.",
  readOnly: true,
  input: z.object({}),
  async run({ supabase }) {
    const { data, error } = await supabase.from("profiles").select(`${PERSON}, is_admin`).order("full_name");
    if (error) return fail(error.message);
    return ok(data);
  },
});

export const listProjects = defineTool({
  name: "list_projects",
  description: "Projects with client, lead, task counts and health (late, at_risk, on_track) and the reason for it.",
  readOnly: true,
  input: z.object({
    status: z.enum(["active", "paused", "done"]).optional().describe("Omit for all"),
    lead_id: id.optional(),
    client_id: id.optional(),
  }),
  async run({ supabase }, input) {
    let q = supabase
      .from("projects")
      .select(`id, name, status, due_date, description, client:clients(id, name), lead:profiles(${PERSON}), tasks(status, due_date)`);
    if (input.status) q = q.eq("status", input.status);
    if (input.lead_id) q = q.eq("lead_id", input.lead_id);
    if (input.client_id) q = q.eq("client_id", input.client_id);
    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false }).order("name");
    if (error) return fail(error.message);

    const today = todayISO();
    return ok(
      data.map(({ tasks, ...p }) => ({
        ...p,
        open_tasks: tasks.filter((t) => t.status !== "done").length,
        total_tasks: tasks.length,
        ...(p.status === "active" ? projectHealth({ due_date: p.due_date, tasks }, today) : {}),
      })),
    );
  },
});

export const getProject = defineTool({
  name: "get_project",
  description: "One project with all its tasks and its discussion thread.",
  readOnly: true,
  input: z.object({ id }),
  async run({ supabase }, input) {
    const [project, tasks, comments] = await Promise.all([
      supabase
        .from("projects")
        .select(`id, name, status, due_date, description, created_at, client:clients(id, name), lead:profiles(${PERSON})`)
        .eq("id", input.id)
        .maybeSingle(),
      supabase.from("tasks").select(TASK).eq("project_id", input.id).order("status").order("position"),
      supabase
        .from("comments")
        .select(`id, body, created_at, author:profiles(${PERSON})`)
        .eq("project_id", input.id)
        .order("created_at"),
    ]);
    if (project.error || tasks.error || comments.error) return fail((project.error ?? tasks.error ?? comments.error)!.message);
    if (!project.data) return fail("Project not found.");
    return ok({ ...project.data, tasks: tasks.data, comments: comments.data });
  },
});

export const listTasks = defineTool({
  name: "list_tasks",
  description:
    "Find tasks. Filters combine. Open tasks only unless include_done. For someone's own tasks, get their id from whoami or list_people.",
  readOnly: true,
  input: z.object({
    project_id: id.optional(),
    assignee_id: id.optional(),
    unassigned: z.boolean().optional().describe("Only tasks nobody has picked up"),
    created_by: id.optional(),
    status: taskStatus.optional(),
    due_before: optionalDate.describe("YYYY-MM-DD, inclusive; use today's date to find overdue and due-today tasks"),
    include_done: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(100),
  }),
  async run({ supabase }, input) {
    let q = supabase.from("tasks").select(TASK);
    if (input.project_id) q = q.eq("project_id", input.project_id);
    if (input.assignee_id) q = q.eq("assignee_id", input.assignee_id);
    if (input.unassigned) q = q.is("assignee_id", null);
    if (input.created_by) q = q.eq("created_by", input.created_by);
    if (input.status) q = q.eq("status", input.status);
    else if (!input.include_done) q = q.neq("status", "done");
    if (input.due_before) q = q.lte("due_date", input.due_before);
    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false }).limit(input.limit);
    if (error) return fail(error.message);
    return ok(data);
  },
});

export const getTask = defineTool({
  name: "get_task",
  description: "One task with its comments.",
  readOnly: true,
  input: z.object({ id }),
  async run({ supabase }, input) {
    const [task, comments] = await Promise.all([
      supabase.from("tasks").select(TASK).eq("id", input.id).maybeSingle(),
      supabase.from("comments").select(`id, body, created_at, author:profiles(${PERSON})`).eq("task_id", input.id).order("created_at"),
    ]);
    if (task.error || comments.error) return fail((task.error ?? comments.error)!.message);
    if (!task.data) return fail("Task not found.");
    return ok({ ...task.data, comments: comments.data });
  },
});

export const listClients = defineTool({
  name: "list_clients",
  description: "Clients with contact details and their projects.",
  readOnly: true,
  input: z.object({}),
  async run({ supabase }) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, contact_name, contact_email, notes, projects(id, name, status)")
      .order("name");
    if (error) return fail(error.message);
    return ok(data);
  },
});

export const listActivity = defineTool({
  name: "list_activity",
  description: "Recent changes across the team, newest first: who did what, on which project. Good for catch-ups and reminders.",
  readOnly: true,
  input: z.object({
    since: z.iso.datetime({ offset: true }).optional().describe("ISO timestamp; only changes after it"),
    project_id: id.optional(),
    actor_id: id.optional().describe("Only changes made by this person"),
    limit: z.number().int().min(1).max(200).default(30),
  }),
  async run({ supabase }, input) {
    let q = supabase
      .from("activity")
      .select(`id, created_at, action, entity_type, entity_id, summary, meta, actor:profiles(${PERSON}), project:projects(id, name)`);
    if (input.since) q = q.gt("created_at", input.since);
    if (input.project_id) q = q.eq("project_id", input.project_id);
    if (input.actor_id) q = q.eq("actor_id", input.actor_id);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(input.limit);
    if (error) return fail(error.message);
    return ok(data);
  },
});

export const listCosts = defineTool({
  name: "list_costs",
  description:
    "All costs and subscriptions in INR, with monthly run rate, spend this month and renewals due in the next 30 days. Admin only.",
  readOnly: true,
  admin: true,
  input: z.object({}),
  async run({ supabase }) {
    const { data, error } = await supabase.from("costs").select("*, project:projects(id, name)").order("name");
    if (error) return fail(error.message);
    const s = summarize(data);
    const brief = (c: (typeof s.described)[number]) => ({
      id: c.id,
      name: c.name,
      vendor: c.vendor,
      amount: Number(c.amount),
      kind: c.kind,
      interval: c.interval,
      active: c.active,
      next_renewal: c.upcoming,
      paid_on: c.paid_on,
      per_month: c.perMonth,
      project: c.project,
      notes: c.notes,
    });
    return ok({
      monthly_run_rate: s.runRate,
      spent_this_month: s.spentThisMonth,
      renewals_next_30_days: s.renewals.map(brief),
      costs: s.described.map(brief),
    });
  },
});
