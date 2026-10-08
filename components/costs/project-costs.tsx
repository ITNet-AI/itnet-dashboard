import { describeCost } from "@/lib/costs";
import { createClient } from "@/lib/supabase/server";
import { CompactCosts } from "./cost-tables";

/** Server wrapper: fetches a project's costs. Rendered only for admins; RLS returns nothing to anyone else. */
export async function ProjectCosts({ projectId }: { projectId: string }) {
  const supabase = await createClient();
  const [{ data: costs }, { data: projects }] = await Promise.all([
    supabase.from("costs").select("*, project:projects(id, name)").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").order("name"),
  ]);
  return <CompactCosts costs={(costs ?? []).map((c) => describeCost(c))} projectId={projectId} projects={projects ?? []} />;
}
