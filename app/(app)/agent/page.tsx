import { redirect } from "next/navigation";
import { createThread, listThreads } from "@/lib/agent/threads";
import { getCurrentUser } from "@/lib/auth";

/** Opens the most recent chat that's still empty, or starts one, so the tab always lands somewhere to type. */
export default async function AgentPage() {
  await getCurrentUser();
  const threads = await listThreads();
  const blank = threads.find((t) => t.title === "New chat");
  redirect(`/agent/${blank?.id ?? (await createThread())}`);
}
