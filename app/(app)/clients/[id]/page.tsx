import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { notFound } from "next/navigation";
import { deleteClientRecord } from "@/actions/clients";
import { ClientForm } from "@/components/clients/client-form";
import { ProjectForm } from "@/components/projects/project-form";
import { PersonName } from "@/components/ui/avatar";
import { Due, ProjectStatus } from "@/components/ui/badges";
import { Empty, Section } from "@/components/ui/page";
import { Progress } from "@/components/ui/progress";
import { getCurrentUser } from "@/lib/auth";
import { PERSON, listClientOptions, listPeople } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { projectHealth } from "@/lib/health";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Client" };
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: client }, { data: projects }, people, clients] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("projects")
      .select(`id, name, status, due_date, lead:profiles(${PERSON}), tasks(status, due_date)`)
      .eq("client_id", id)
      .order("status")
      .order("due_date", { nullsFirst: false }),
    listPeople(),
    listClientOptions(),
  ]);
  if (!client) notFound();
  const list = projects ?? [];
  const today = todayISO();
  const cols = "grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_110px_96px_88px]";

  return (
    <>
      <nav className="pb-3 text-ui">
        <Link href="/clients" className="text-ink-2 hover:text-ink">
          Clients
        </Link>
      </nav>
      <header className="flex flex-col gap-4 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h1 className="display flex min-w-0 items-baseline gap-3">
            <span className="min-w-0 break-words">{client.name}</span>
            <span className="text-ink-3" aria-label={`${list.length} projects`}>
              {list.length}
            </span>
          </h1>
          <div className="flex gap-2">
            <ClientForm client={client} />
            <ProjectForm people={people} clients={clients} defaultClientId={client.id} currentUserId={user.id} />
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-ui">
          <div className="flex gap-2">
            <dt className="text-ink-3">Contact</dt>
            <dd>{client.contact_name ?? "None"}</dd>
          </div>
          {client.contact_email ? (
            <div className="flex gap-2">
              <dt className="text-ink-3">Email</dt>
              <dd>
                <a href={`mailto:${client.contact_email}`} className="text-accent hover:underline">
                  {client.contact_email}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        {client.notes ? <p className="max-w-[65ch] whitespace-pre-wrap text-body text-ink-2">{client.notes}</p> : null}
      </header>

      <Section title="Projects" count={list.length}>
        {list.length ? (
          <div className="overflow-x-auto">
            <ul className="min-w-[560px]">
              {list.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className={`group grid ${cols} min-h-11 items-center gap-4 border-b border-line py-2 text-body hover:bg-bg`}>
                    <span className="truncate font-medium group-hover:text-accent">{p.name}</span>
                    <span className="min-w-0 text-ui">
                      <PersonName person={p.lead} />
                    </span>
                    <Progress
                      done={p.tasks.filter((t) => t.status === "done").length}
                      total={p.tasks.length}
                      tone={p.status === "active" ? projectHealth(p, today).health : "accent"}
                    />
                    <span className="text-ui">{p.due_date ? <Due date={p.due_date} done={p.status === "done"} /> : <span className="text-ink-3">None</span>}</span>
                    <ProjectStatus status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty action={<ProjectForm people={people} clients={clients} defaultClientId={client.id} currentUserId={user.id} trigger="Start a project" />}>
            No projects for {client.name} yet.
          </Empty>
        )}
      </Section>

      {user.is_admin ? (
        <form action={deleteClientRecord} className="flex justify-end pt-12">
          <input type="hidden" name="id" value={client.id} />
          <details className="text-ui">
            <summary className="cursor-pointer list-none text-ink-3 hover:text-crit">Delete client</summary>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-ink-2">Projects stay and become internal.</span>
              <button type="submit" className="font-medium text-crit hover:underline">
                Delete for good
              </button>
            </div>
          </details>
        </form>
      ) : null}
    </>
  );
}
