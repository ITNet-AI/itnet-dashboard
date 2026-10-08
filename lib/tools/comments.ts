import "server-only";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { findMentions } from "@/lib/mentions";
import { defineTool, fail, id, ok, quote } from "./define";

export const addComment = defineTool({
  name: "add_comment",
  description:
    "Comment on a task or a project. Pass exactly one of task_id or project_id. Tag people by writing @Full Name in the body (names from list_people), or pass their ids in mentions.",
  input: z
    .object({
      body: z.string({ error: "Write something first." }).trim().min(1, "Write something first.").max(10000),
      task_id: id.nullish(),
      project_id: id.nullish(),
      mentions: z.array(id).max(20).optional().describe("Profile ids to tag, in addition to any @Full Name in the body"),
    })
    .refine((v) => Boolean(v.task_id) !== Boolean(v.project_id), "A comment belongs to one task or one project."),
  async run({ supabase, user }, { mentions: extra, ...input }) {
    // Only real teammates can be tagged, and tagging yourself does nothing.
    const { data: people, error: peopleError } = await supabase.from("profiles").select("id, full_name, email");
    if (peopleError) return fail(peopleError.message);
    const known = new Set(people.map((p) => p.id));
    const mentions = [...new Set([...findMentions(input.body, people), ...(extra ?? [])])].filter(
      (id) => known.has(id) && id !== user.id,
    );

    const { data, error } = await supabase
      .from("comments")
      .insert({ ...input, mentions, author_id: user.id })
      .select("id, task:tasks(id, title, project_id), project:projects(id, name)")
      .single();
    if (error) return fail(error.message);

    const target = data.task ? quote(data.task.title) : data.project ? quote(data.project.name) : "";
    await logActivity(supabase, {
      entity_type: "comment",
      entity_id: data.id,
      project_id: data.task?.project_id ?? data.project?.id ?? null,
      action: "commented",
      summary: `commented on ${target}`,
      meta: { task_id: data.task?.id ?? null, excerpt: input.body.slice(0, 140), mentions },
    });
    return ok({ id: data.id, mentions });
  },
});

export const deleteComment = defineTool({
  name: "delete_comment",
  description: "Delete one of your own comments. Admins can delete anyone's.",
  input: z.object({ id }),
  async run({ supabase }, input) {
    const { data, error } = await supabase.from("comments").delete().eq("id", input.id).select("id");
    if (error) return fail(error.message);
    if (!data.length) return fail("Comment not found, or you can't delete it.");
    return ok({ id: input.id });
  },
});
