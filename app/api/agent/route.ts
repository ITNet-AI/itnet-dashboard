import { createHash } from "node:crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, safeValidateUIMessages, streamText, toUIMessageStream, type UIMessage } from "ai";
import { agentTools } from "@/lib/agent/tools";
import { systemPrompt } from "@/lib/agent/prompt";
import { getThread, saveThread } from "@/lib/agent/threads";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Vercel Hobby stops a function at 60 seconds; a turn with a dozen tool calls fits comfortably inside that.
export const maxDuration = 60;

const MODEL = process.env.AGENT_MODEL ?? "claude-sonnet-5-5";

// Keys that aren't scoped to one workspace must name it on every request.
const anthropic = createAnthropic({
  headers: process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } : undefined,
});
const MAX_STEPS = 12;
const MAX_INPUT = 4000;

/** Signs approval requests so a client can't forge a "yes" to a delete. Derived, so no extra env var is required. */
const APPROVAL_SECRET = (() => {
  const base = process.env.AGENT_APPROVAL_SECRET ?? process.env.SUPABASE_SECRET_KEY;
  return base ? createHash("sha256").update(`agent-approval:${base}`).digest() : undefined;
})();

const json = (status: number, error: string) => Response.json({ error }, { status });

/** One turn of a chat: runs the model with the person's own tools and streams text, tool calls and approvals back. */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, "The agent isn't set up yet. Add ANTHROPIC_API_KEY to the environment.");

  const user = await getSessionUser();
  if (!user) return json(401, "Your session has ended. Sign in again.");

  const body = (await request.json().catch(() => null)) as { id?: string; messages?: unknown } | null;
  const thread = body?.id ? await getThread(body.id) : null;
  if (!thread) return json(404, "This chat doesn't exist, or isn't yours.");

  const supabase = await createClient();
  const ctx = { supabase, user };
  const { tools, approval } = agentTools(ctx);

  const parsed = await safeValidateUIMessages<UIMessage>({ messages: body?.messages, tools });
  if (!parsed.success) return json(400, "That message couldn't be read. Reload the page and try again.");
  const messages = parsed.data;
  const last = messages.at(-1);
  const lastText = last?.role === "user" ? last.parts.map((p) => (p.type === "text" ? p.text : "")).join("") : "";
  if (lastText.length > MAX_INPUT) return json(400, `Keep a message under ${MAX_INPUT} characters.`);

  const result = streamText({
    model: anthropic(MODEL),
    system: systemPrompt(user),
    messages: await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    toolApproval: approval,
    experimental_toolApprovalSecret: APPROVAL_SECRET,
    stopWhen: isStepCount(MAX_STEPS),
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      onEnd: async ({ messages: all }) => {
        await saveThread(supabase, thread.id, all);
      },
      onError: (error) => {
        console.error("agent turn failed", error);
        const message = error instanceof Error ? error.message : String(error);
        if (/rate.?limit|overloaded|529|429/i.test(message)) return "The model is busy right now. Try again in a moment.";
        if (/workspace/i.test(message)) return "This API key isn't tied to a workspace. Set ANTHROPIC_WORKSPACE_ID, or use a key made inside a workspace.";
        if (/invalid x-api-key|authentication_error|401/i.test(message)) return "The agent's API key was rejected. Check ANTHROPIC_API_KEY.";
        return "Something went wrong on that turn. Try again.";
      },
    }),
  });
}
