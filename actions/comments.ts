"use server";

import { run, text, toState, type ActionState } from "@/lib/action-utils";
import * as comments from "@/lib/tools/comments";

export async function addComment(_: ActionState, fd: FormData): Promise<ActionState> {
  return toState(
    await run(comments.addComment, { body: text(fd, "body"), task_id: text(fd, "task_id"), project_id: text(fd, "project_id") }),
  );
}

export async function deleteComment(id: string): Promise<ActionState> {
  return toState(await run(comments.deleteComment, { id }));
}
