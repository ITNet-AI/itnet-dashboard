"use server";

import { run, text, toState, type ActionState } from "@/lib/action-utils";
import * as tasks from "@/lib/tools/tasks";

/** Quick add from the board or a project. Lands at the bottom of its column. */
export async function createTask(_: ActionState, fd: FormData): Promise<ActionState> {
  return toState(
    await run(tasks.createTask, {
      project_id: text(fd, "project_id"),
      title: text(fd, "title"),
      status: text(fd, "status") ?? undefined,
      assignee_id: text(fd, "assignee_id"),
      due_date: text(fd, "due_date"),
    }),
  );
}

/** Full edit from the task dialog. */
export async function updateTask(_: ActionState, fd: FormData): Promise<ActionState> {
  return toState(
    await run(tasks.updateTask, {
      id: text(fd, "id"),
      title: text(fd, "title"),
      description: text(fd, "description"),
      status: text(fd, "status"),
      assignee_id: text(fd, "assignee_id"),
      due_date: text(fd, "due_date"),
    }),
  );
}

/** Drag on the board: new column and a position between neighbours. */
export async function moveTask(id: string, to: "todo" | "doing" | "done", position: number): Promise<ActionState> {
  return toState(await run(tasks.moveTask, { id, status: to, position }));
}

/** "Assign" on Home. null hands the task back to nobody. */
export async function assignTask(id: string, assigneeId: string | null): Promise<ActionState> {
  return toState(await run(tasks.updateTask, { id, assignee_id: assigneeId }));
}

/** Checkbox in task lists. */
export async function setTaskDone(id: string, done: boolean): Promise<ActionState> {
  return toState(await run(tasks.setTaskDone, { id, done }));
}

export async function deleteTask(id: string): Promise<ActionState> {
  return toState(await run(tasks.deleteTask, { id }));
}
