import "server-only";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { displayName } from "@/lib/format";
import { defineTool, fail, id, ok, optionalDate, optionalId, quote, taskStatus, type ToolContext } from "./define";

const STATUS_LABEL = { todo: "To do", doing: "In progress", done: "Done" } as const;
const title = z.string({ error: "Write what needs doing." }).trim().min(1, "Write what needs doing.").max(300);

export const createTask = defineTool({
  name: "create_task",
  description: "Add a task to a project. It lands at the bottom of its column. Anyone can assign anyone.",
  input: z.object({
    project_id: id,
    title,
    description: z.string().max(10000).nullish(),
    status: taskStatus.default("todo"),
    assignee_id: optionalId.describe("Profile id of the person doing it; omit to leave unassigned"),
    due_date: optionalDate,
  }),
  async run({ supabase, user }, input) {
    const { data: last } = await supabase
      .from("tasks")
      .select("position")
      .eq("project_id", input.project_id)
      .eq("status", input.status)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...input, created_by: user.id, position: (last?.position ?? 0) + 1024 })
      .select("id, title, project_id, assignee:profiles!tasks_assignee_id_fkey(full_name, email)")
      .single();
    if (error) return fail(error.message);

    const forWhom = data.assignee && input.assignee_id !== user.id ? ` for ${displayName(data.assignee)}` : "";
    await logActivity(supabase, {
      entity_type: "task",
      entity_id: data.id,
      project_id: data.project_id,
      action: "created",
      summary: `added ${quote(data.title)}${forWhom}`,
      meta: { assignee_id: input.assignee_id ?? null },
    });
    return ok({ id: data.id });
  },
});

export const updateTask = defineTool({
  name: "update_task",
  description:
    "Change a task. Send only the fields to change; null clears assignee, due date or description. Logs the most meaningful change.",
  input: z.object({
    id,
    title: title.optional(),
    description: z.string().max(10000).nullish(),
    status: taskStatus.optional(),
    assignee_id: optionalId,
    due_date: optionalDate,
  }),
  async run({ supabase, user }, { id, ...fields }) {
    const { data: before } = await supabase.from("tasks").select("status, assignee_id").eq("id", id).maybeSingle();
    if (!before) return fail("This task was deleted.");

    const statusChanged = fields.status !== undefined && fields.status !== before.status;
    const assigneeChanged = fields.assignee_id !== undefined && fields.assignee_id !== before.assignee_id;
    const patch: typeof fields & { position?: number } = { ...fields };
    if (statusChanged) patch.position = Date.now();

    const { data, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select("id, title, project_id, status, assignee:profiles!tasks_assignee_id_fkey(full_name, email)")
      .single();
    if (error) return fail(error.message);

    let action = "updated";
    let summary = `edited ${quote(data.title)}`;
    if (statusChanged) {
      action = data.status === "done" ? "completed" : "moved";
      summary = data.status === "done" ? `finished ${quote(data.title)}` : `moved ${quote(data.title)} to ${STATUS_LABEL[data.status]}`;
    } else if (assigneeChanged) {
      action = "assigned";
      summary = data.assignee
        ? fields.assignee_id === user.id
          ? `picked up ${quote(data.title)}`
          : `assigned ${quote(data.title)} to ${displayName(data.assignee)}`
        : `unassigned ${quote(data.title)}`;
    }
    await logActivity(supabase, {
      entity_type: "task",
      entity_id: data.id,
      project_id: data.project_id,
      action,
      summary,
      meta: { status: data.status, assignee_id: fields.assignee_id ?? before.assignee_id },
    });
    return ok({ id: data.id });
  },
});

async function move(supabase: ToolContext["supabase"], id: string, to: z.infer<typeof taskStatus>, position: number) {
  const { data: before } = await supabase.from("tasks").select("status").eq("id", id).maybeSingle();
  if (!before) return fail("This task was deleted.");
  const { data, error } = await supabase
    .from("tasks")
    .update({ status: to, position })
    .eq("id", id)
    .select("id, title, project_id")
    .single();
  if (error) return fail(error.message);

  if (before.status !== to) {
    await logActivity(supabase, {
      entity_type: "task",
      entity_id: data.id,
      project_id: data.project_id,
      action: to === "done" ? "completed" : "moved",
      summary: to === "done" ? `finished ${quote(data.title)}` : `moved ${quote(data.title)} to ${STATUS_LABEL[to]}`,
      meta: { status: to },
    });
  }
  return ok({ id: data.id });
}

export const moveTask = defineTool({
  name: "move_task",
  description: "Move a task to a board column. Without a position it goes to the bottom of that column.",
  input: z.object({
    id,
    status: taskStatus,
    position: z.number().finite().optional().describe("Sort key within the column; lower is higher up"),
  }),
  run: ({ supabase }, input) => move(supabase, input.id, input.status, input.position ?? Date.now()),
});

export const setTaskDone = defineTool({
  name: "set_task_done",
  description: "Mark a task done, or reopen it (back to To do).",
  input: z.object({ id, done: z.boolean() }),
  run: ({ supabase }, input) => move(supabase, input.id, input.done ? "done" : "todo", Date.now()),
});

export const deleteTask = defineTool({
  name: "delete_task",
  description: "Delete a task and its comments. Cannot be undone.",
  input: z.object({ id }),
  async run({ supabase }, input) {
    const { data, error } = await supabase.from("tasks").delete().eq("id", input.id).select("id, title, project_id").single();
    if (error) return fail(error.message);
    await logActivity(supabase, {
      entity_type: "task",
      entity_id: data.id,
      project_id: data.project_id,
      action: "deleted",
      summary: `deleted ${quote(data.title)}`,
    });
    return ok({ id: data.id });
  },
});
