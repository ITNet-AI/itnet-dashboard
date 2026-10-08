import type { Metadata } from "next";
import Link from "next/link";
import { NewTask } from "@/components/tasks/new-task";
import { TaskList } from "@/components/tasks/task-list";
import { buttonClass } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { listPeople, listProjectOptions, listTasks } from "@/lib/queries";

export const metadata: Metadata = { title: "Tasks" };

const VIEWS = { mine: "Assigned to me", created: "Created by me", all: "Everyone" } as const;
type View = keyof typeof VIEWS;

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const view: View = sp.view === "created" || sp.view === "all" ? sp.view : "mine";
  const showDone = sp.done === "1";
  const user = await getCurrentUser();

  const [tasks, people, projects] = await Promise.all([
    listTasks({
      assigneeId: view === "mine" ? user.id : undefined,
      createdBy: view === "created" ? user.id : undefined,
      includeDone: showDone,
    }),
    listPeople(),
    listProjectOptions(),
  ]);
  const open = tasks.filter((t) => t.status !== "done").length;

  const href = (v: View, done = showDone) => {
    const p = new URLSearchParams();
    if (v !== "mine") p.set("view", v);
    if (done) p.set("done", "1");
    const qs = p.toString();
    return qs ? `/tasks?${qs}` : "/tasks";
  };

  return (
    <>
      <PageHeader title="Tasks" figure={open} figureLabel="open">
        <NewTask projects={projects} people={people} currentUserId={user.id} defaultAssignee={view === "mine" ? user.id : undefined} />
      </PageHeader>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <TabLinks tabs={(Object.keys(VIEWS) as View[]).map((v) => ({ href: href(v), label: VIEWS[v], active: v === view }))} />
        </div>
        <Link href={href(view, !showDone)} className="pb-2.5 text-ui text-ink-2 hover:text-ink">
          {showDone ? "Hide finished" : "Show finished"}
        </Link>
      </div>
      <TaskList
        tasks={tasks}
        showAssignee={view !== "mine"}
        empty={view === "mine" ? "Nothing assigned to you. Enjoy it, or pick something up from a project." : "No open tasks here."}
        emptyAction={
          view === "mine" ? (
            <Link href="/projects" className={buttonClass("primary")}>
              Browse projects
            </Link>
          ) : undefined
        }
      />
    </>
  );
}
