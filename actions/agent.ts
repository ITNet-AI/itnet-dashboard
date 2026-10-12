"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createThread } from "@/lib/agent/threads";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function newThread() {
  await getCurrentUser();
  redirect(`/agent/${await createThread()}`);
}

/** Deletes one of the person's own chats. RLS makes anyone else's a no-op. */
export async function deleteThread(id: string, current: boolean) {
  await getCurrentUser();
  const supabase = await createClient();
  await supabase.from("agent_threads").delete().eq("id", id);
  revalidatePath("/agent", "layout");
  if (current) redirect("/agent");
}
