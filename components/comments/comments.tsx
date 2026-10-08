"use client";

import { useActionState, useRef, useTransition } from "react";
import { addComment, deleteComment } from "@/actions/comments";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { ago, displayName } from "@/lib/format";
import { splitMentions } from "@/lib/mentions";
import type { Person } from "@/lib/queries";
import { MentionTextarea } from "./mention-textarea";

export type CommentItem = {
  id: string;
  body: string;
  created_at: string;
  mentions: string[];
  author: { id: string; full_name: string; email: string } | null;
};

export function Comments({
  comments,
  taskId,
  projectId,
  people,
  currentUserId,
  isAdmin,
}: {
  comments: CommentItem[];
  people: Person[];
  taskId?: string;
  projectId?: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof addComment>>, fd: FormData) => {
    const result = await addComment(prev, fd);
    if (result?.ok) formRef.current?.reset();
    return result;
  }, null);
  const [, startTransition] = useTransition();
  const fieldId = `comment-${taskId ?? projectId}`;

  return (
    <div className="flex flex-col gap-4">
      {comments.length ? (
        <ol className="flex flex-col gap-4">
          {comments.map((c) => (
            <li key={c.id} className="group flex gap-3">
              <Avatar person={c.author} size={24} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-ui font-medium">{displayName(c.author)}</span>
                  <time className="text-meta text-ink-3" dateTime={c.created_at}>
                    {ago(c.created_at)}
                  </time>
                  {c.author?.id === currentUserId || isAdmin ? (
                    <button
                      type="button"
                      onClick={() => startTransition(() => void deleteComment(c.id))}
                      className="ml-auto text-meta text-ink-3 opacity-0 hover:text-crit focus:opacity-100 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap break-words text-body text-ink">
                  <Body comment={c} people={people} currentUserId={currentUserId} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <form ref={formRef} action={action} className="flex flex-col gap-2">
        {taskId ? <input type="hidden" name="task_id" value={taskId} /> : null}
        {projectId ? <input type="hidden" name="project_id" value={projectId} /> : null}
        <label htmlFor={fieldId} className="sr-only">
          Write a comment
        </label>
        <MentionTextarea
          people={people}
          id={fieldId}
          name="body"
          rows={2}
          placeholder={comments.length ? "Reply" : "Start the discussion"}
          className="min-h-16"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <FormError message={state?.error} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-meta text-ink-3">@ to tag someone, ⌘ Enter to send</span>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Posting…" : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** The comment text with tagged people picked out; a tag of you stands out more. */
function Body({ comment, people, currentUserId }: { comment: CommentItem; people: Person[]; currentUserId: string }) {
  const tagged = people.filter((p) => comment.mentions.includes(p.id));
  return splitMentions(comment.body, tagged).map((part, i) =>
    typeof part === "string" ? (
      part
    ) : (
      <span
        key={i}
        className={part.id === currentUserId ? "-mx-0.5 rounded-[4px] bg-accent-soft px-0.5 font-medium text-accent" : "font-medium text-accent"}
      >
        @{displayName(part)}
      </span>
    ),
  );
}
