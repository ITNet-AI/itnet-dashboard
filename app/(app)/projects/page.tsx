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

export const metadata: Metadata = { title: "Projects" };

const FILTERS = ["active", "paused", "done", "all"] as const;
type Filter = (typeof FILTERS)[number];
const LABELS: Record<Filter, string> = { active: "Active", paused: "Paused", done: "Done", all: "All" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const { status } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : "active";
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: projects }, people, clients] = await Promise.all([
    supabase
      .from("projects")
      .select(`id, name, status, due_date, client:clients(id, name), lead:profiles(${PERSON}), tasks(status)`)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("name"),
    listPeople(),
    listClientOptions(),
  ]);

  const all = projects ?? [];
  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? all.length : all.filter((p) => p.status === f).length]));
  const shown = filter === "all" ? all : all.filter((p) => p.status === filter);

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
            <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_110px_96px_88px] gap-4 border-b border-line py-2 text-meta text-ink-3">
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
                return (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="group grid min-h-11 grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_110px_96px_88px] items-center gap-4 border-b border-line py-2 text-body hover:bg-bg"
                    >
                      <span className="truncate font-medium group-hover:text-accent">{p.name}</span>
                      <span className="truncate text-ink-2">{p.client?.name ?? "Internal"}</span>
                      <span className="min-w-0 text-ui">
                        <PersonName person={p.lead} />
                      </span>
                      <Progress done={done} total={p.tasks.length} />
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
        <Empty>
          {filter === "active" ? "No active projects. Start one with New project." : `No ${LABELS[filter].toLowerCase()} projects.`}
        </Empty>
      )}
    </>
  );
}
