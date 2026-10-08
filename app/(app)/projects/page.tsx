import type { Metadata } from "next";
import Link from "next/link";
import { ProjectForm } from "@/components/projects/project-form";
import { PersonName } from "@/components/ui/avatar";
import { Due, ProjectStatus } from "@/components/ui/badges";
import { Empty, PageHeader, TabLinks } from "@/components/ui/page";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { PERSON, listClientOptions, listPeople } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { projectHealth, type Health } from "@/lib/health";

export const metadata: Metadata = { title: "Projects" };

const FILTERS = ["active", "paused", "done", "all"] as const;
type Filter = (typeof FILTERS)[number];
const LABELS: Record<Filter, string> = { active: "Active", paused: "Paused", done: "Done", all: "All" };
const EDGE: Record<Health, string> = { late: "border-l-crit", at_risk: "border-l-warn", on_track: "border-l-good" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const { status } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : "active";
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: projects }, people, clients] = await Promise.all([
    supabase
      .from("projects")
      .select(`id, name, status, due_date, client:clients(id, name), lead:profiles(${PERSON}), tasks(status, due_date)`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("name"),
    listPeople(),
    listClientOptions(),
  ]);

  const all = projects ?? [];
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? all.length : all.filter((p) => p.status === f).length]));
  const shown = filter === "all" ? all : all.filter((p) => p.status === filter);
  const today = todayISO();

  return (
    <>
      <PageHeader title="Projects" figure={counts.active} figureLabel="active">
        <ProjectForm people={people} clients={clients} currentUserId={user.id} />
      </PageHeader>
      <TabLinks
        tabs={FILTERS.map((f) => ({
          href: f === "active" ? "/projects" : `/projects?status=${f}`,
          label: LABELS[f],
          count: counts[f],
          active: f === filter,
        }))}
      />
      {shown.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="colhead grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_110px_96px_88px] gap-4 border-b border-line py-2 pl-3">
              <span>Project</span>
              <span>Client</span>
              <span>Lead</span>
              <span>Tasks done</span>
              <span>Due</span>
              <span>Status</span>
            </div>
            <ul>
              {shown.map((p) => {
                const done = p.tasks.filter((t) => t.status === "done").length;
                const health = p.status === "active" ? projectHealth(p, today).health : null;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className={`group grid min-h-11 grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_110px_96px_88px] items-center gap-4 border-b border-l-2 border-line py-2 pl-3 text-body hover:bg-bg ${
                        health ? EDGE[health] : "border-l-transparent"
                      }`}
                    >
                      <span className="truncate font-medium group-hover:text-accent">{p.name}</span>
                      <span className="truncate text-ink-2">{p.client?.name ?? "Internal"}</span>
                      <span className="min-w-0 text-ui">
                        <PersonName person={p.lead} />
                      </span>
                      <Progress done={done} total={p.tasks.length} tone={health ?? "accent"} />
                      <span className="text-ui">{p.due_date ? <Due date={p.due_date} done={p.status === "done"} /> : <span className="text-ink-3">None</span>}</span>
                      <ProjectStatus status={p.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <Empty
          action={
            filter === "active" ? (
              <ProjectForm people={people} clients={clients} currentUserId={user.id} trigger="Start a project" />
            ) : undefined
          }
        >
          {filter === "active" ? "No active projects yet. Start one and give it a lead and a due date." : `No ${LABELS[filter].toLowerCase()} projects.`}
        </Empty>
      )}
    </>
  );
}
