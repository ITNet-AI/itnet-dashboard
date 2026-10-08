import "server-only";
import { todayISO } from "@/lib/dates";
import { projectHealth } from "@/lib/health";
import { createClient } from "@/lib/supabase/server";

export const PERSON = "id, full_name, email";
export const TASK_FIELDS = `id, title, description, status, due_date, position, project_id, assignee_id, created_at,
  assignee:profiles!tasks_assignee_id_fkey(${PERSON}),
  project:projects(id, name),
  comments(count)`;

export type Person = { id: string; full_name: string; email: string };

export async function listPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PERSON).order("full_name");
  return data ?? [];
}

export async function listClientOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name").order("name");
  return data ?? [];
}

export async function listProjectOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, name, status").neq("status", "done").order("name");
  return data ?? [];
}

export async function listTasks(filter: { projectId?: string; assigneeId?: string; createdBy?: string; includeDone?: boolean }) {
  const supabase = await createClient();
  let q = supabase.from("tasks").select(TASK_FIELDS);
  if (filter.projectId) q = q.eq("project_id", filter.projectId);
  if (filter.assigneeId) q = q.eq("assignee_id", filter.assigneeId);
  if (filter.createdBy) q = q.eq("created_by", filter.createdBy);
  if (!filter.includeDone) q = q.neq("status", "done");
  const { data, error } = await q.order("position").limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({ ...t, comment_count: t.comments[0]?.count ?? 0 }));
}

export type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

/** One task with its thread, for the task dialog. */
export async function getTaskDetail(id: string) {
  const supabase = await createClient();
  const [{ data: task }, { data: comments }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        `id, title, description, status, due_date, project_id, assignee_id, created_at,
         creator:profiles!tasks_created_by_fkey(${PERSON}), project:projects(id, name)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("comments")
      .select(`id, body, mentions, created_at, author:profiles(${PERSON})`)
      .eq("task_id", id)
      .order("created_at"),
  ]);
  return task ? { task, comments: comments ?? [] } : null;
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;

/** Comments that tag this person, for "Mentioned you" on Home. */
export async function listMentions(personId: string, limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(`id, body, created_at, author:profiles(${PERSON}), task:tasks(id, title, project_id), project:projects(id, name)`)
    .contains("mentions", [personId])
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type MentionRow = Awaited<ReturnType<typeof listMentions>>[number];

export async function listActivity(limit = 30, projectId?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("activity")
    .select(`id, summary, action, entity_type, entity_id, created_at, meta, actor:profiles(${PERSON}), project:projects(id, name)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (projectId) q = q.eq("project_id", projectId);
  const { data } = await q;
  return data ?? [];
}

export type ActivityRow = Awaited<ReturnType<typeof listActivity>>[number];

/** Active projects for the sidebar: soonest due first, with a health reading each. */
export async function listNavProjects(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, due_date, tasks(status, due_date)")
    .eq("status", "active")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  const today = todayISO();
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, health: projectHealth(p, today).health }));
}
