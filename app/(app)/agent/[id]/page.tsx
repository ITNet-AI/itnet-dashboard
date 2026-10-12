import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentChat } from "@/components/agent/chat";
import { getThread, listThreads } from "@/lib/agent/threads";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentThreadPage({ params }: PageProps<"/agent/[id]">) {
  const { id } = await params;
  const [user, thread, threads] = await Promise.all([getCurrentUser(), getThread(id), listThreads()]);
  if (!thread) notFound();
  return (
    <AgentChat
      key={thread.id}
      thread={{ id: thread.id, messages: thread.messages }}
      threads={threads}
      user={{ full_name: user.full_name, email: user.email, is_admin: user.is_admin }}
      configured={Boolean(process.env.ANTHROPIC_API_KEY)}
    />
  );
}
