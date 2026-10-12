import "server-only";
import type { UIMessage } from "ai";
import { cache } from "react";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/** Keeps one long chat from growing without bound. Older turns drop off the front. */
const KEEP = 60;

export type ThreadSummary = { id: string; title: string; updated_at: string };

/** The signed-in person's chats, newest first. RLS returns only their own. */
export const listThreads = cache(async (): Promise<ThreadSummary[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("agent_threads").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(50);
  return data ?? [];
});

/** One chat with its messages, or null when it doesn't exist or isn't theirs. */
export const getThread = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("agent_threads").select("id, title, messages, updated_at").eq("id", id).maybeSingle();
  return data ? { ...data, messages: data.messages as unknown as UIMessage[] } : null;
});

export async function createThread() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("agent_threads").insert({}).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Stores the whole conversation after a turn. The first thing the person asked becomes the title.
 * Takes the client made at the start of the request, since this runs as the stream ends.
 */
export async function saveThread(supabase: Awaited<ReturnType<typeof createClient>>, id: string, messages: UIMessage[]) {
  const kept = messages.slice(-KEEP);
  const { error } = await supabase
    .from("agent_threads")
    .update({ messages: kept as unknown as Json, title: titleFrom(messages), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("agent thread not saved", error.message);
}

function titleFrom(messages: UIMessage[]) {
  const first = messages.find((m) => m.role === "user");
  const text = first?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "New chat";
  return text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;
}
