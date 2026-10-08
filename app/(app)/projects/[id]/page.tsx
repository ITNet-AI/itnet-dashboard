import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProject } from "@/actions/projects";
import { Comments } from "@/components/comments/comments";
import { ProjectCosts } from "@/components/costs/project-costs";
import { ActivityFeed } from "@/components/home/activity-feed";
import { ProjectForm } from "@/components/projects/project-form";
import { Board } from "@/components/tasks/board";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { PersonName } from "@/components/ui/avatar";
import { Due, ProjectStatus } from "@/components/ui/badges";
import { Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { PERSON, getTaskDetail, listActivity, listClientOptions, listPeople, listTasks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/projects/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const { task: taskParam } = await searchParams;
  const taskId = typeof taskParam === "string" ? taskParam : undefined;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: project }, tasks, people, clients, { data: comments }, activity, detail] = await Promise.all([
    supabase
      .from("projects")
      .select(`id, name, description, status, due_date, client_id, lead_id, client:clients(id, name), lead:profiles(${PERSON})`)
      .eq("id", id)
      .maybeSingle(),
    listTasks({ projectId: id, includeDone: true }),
    listPeople(),
    listClientOptions(),
    supabase.from("comments").select(`id, body, mentions, created_at, author:profiles(${PERSON})`).eq("project_id", id).order("created_at"),
    listActivity(12, id),
    taskId && /^[0-9a-f-]{36}$/i.test(taskId) ? getTaskDetail(taskId) : Promise.resolve(null),
  ]);
  if (!project) notFound();

  const open = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <nav className="pb-3 text-ui">
        <Link href="/projects" className="text-ink-2 hover:text-ink">
          Projects
        </Link>
        {project.client ? (
          <>
            <span className="px-2 text-ink-3">/</span>
            <Link href={`/clients/${project.client.id}`} className="text-ink-2 hover:text-ink">
              {project.client.name}
            </Link>
          </>
        ) : null}
      </nav>

      <header className="flex flex-col gap-4 pb-7">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h1 className="display flex min-w-0 items-baseline gap-3">
            <span className="min-w-0 break-words">{project.name}</span>
            <span className="text-ink-3" aria-label={`${open} open tasks`}>
              {open}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <ProjectForm
              project={project}
              people={people}
              clients={clients}
              currentUserId={user.id}
              trigger="Edit project"
            />
          </div>
        </div>
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-2 text-ui">
          <div className="flex items-center gap-2">
            <dt className="text-ink-3">Lead</dt>
            <dd>
              <PersonName person={project.lead} />
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-ink-3">Client</dt>
            <dd>{project.client?.name ?? "Internal"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-ink-3">Due</dt>
            <dd>{project.due_date ? <Due date={project.due_date} done={project.status === "done"} /> : "No date"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Status</dt>
            <dd>
              <ProjectStatus status={project.status} />
            </dd>
          </div>
        </dl>
        {project.description ? <p className="max-w-[65ch] whitespace-pre-wrap text-body text-ink-2">{project.description}</p> : null}
      </header>

      <Board tasks={tasks} projectId={project.id} />
      <p className="pt-2 text-meta text-ink-3">Drag cards between columns. Press C to add a task.</p>

      <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section id="discussion" title="Discussion" count={comments?.length ?? 0}>
          <div className="pt-4">
            <Comments comments={comments ?? []} people={people} projectId={project.id} currentUserId={user.id} isAdmin={user.is_admin} />
          </div>
        </Section>
        <div className="flex min-w-0 flex-col gap-10">
          {user.is_admin ? <ProjectCosts projectId={project.id} /> : null}
          <Section title="Recent activity">
            <ActivityFeed items={activity} showProject={false} empty="Nothing yet." />
          </Section>
        </div>
      </div>

      {user.is_admin ? (
        <form action={deleteProject} className="flex justify-end pt-12">
          <input type="hidden" name="id" value={project.id} />
          <DeleteProjectButton />
        </form>
      ) : null}

      {detail ? <TaskDialog detail={detail} people={people} currentUserId={user.id} isAdmin={user.is_admin} /> : null}
    </>
  );
}

function DeleteProjectButton() {
  return (
    <details className="group text-ui">
      <summary className="cursor-pointer list-none text-ink-3 hover:text-crit">Delete project</summary>
      <div className="flex items-center gap-3 pt-2">
        <span className="text-ink-2">This deletes every task and comment in it.</span>
        <button type="submit" className="font-medium text-crit hover:underline">
          Delete for good
        </button>
      </div>
    </details>
  );
}
