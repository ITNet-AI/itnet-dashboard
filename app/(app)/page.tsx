import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/home/activity-feed";
import { OwnerHome } from "@/components/home/owner-home";
import { TaskList } from "@/components/tasks/task-list";
import { Due } from "@/components/ui/badges";
import { Empty, PageHeader, Section } from "@/components/ui/page";
import { getCurrentUser } from "@/lib/auth";
import { daysBetween, todayISO } from "@/lib/dates";
import { firstName, todayHeading } from "@/lib/format";
import { listActivity, listTasks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { recordHomeVisit } from "@/lib/visits";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user.is_admin) {
    const digestFrom = await recordHomeVisit(user);
    return <OwnerHome user={user} digestFrom={digestFrom} />;
  }
  return <MemberHome user={user} />;
}

/** Home for members: their own work first, then what the team is doing. */
async function MemberHome({ user }: { user: { id: string; full_name: string; email: string } }) {
  const supabase = await createClient();
  const today = todayISO();

  const [mine, activity, { data: leading }] = await Promise.all([
    listTasks({ assigneeId: user.id }),
    listActivity(25),
    supabase
      .from("projects")
      .select("id, name, due_date, tasks(status, due_date)")
      .eq("status", "active")
      .eq("lead_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const dueThisWeek = mine.filter((t) => t.due_date && daysBetween(today, t.due_date) <= 7).length;
  const overdue = mine.filter((t) => t.due_date && t.due_date < today).length;
  const summary = [
    mine.length ? `${mine.length} open ${mine.length === 1 ? "task" : "tasks"} on your plate` : "Nothing on your plate",
    dueThisWeek ? `${dueThisWeek} due this week` : null,
    overdue ? `${overdue} overdue` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={todayHeading()}
        meta={
          <p className="text-body text-ink-2">
            Hi {firstName(user)}. {summary}.
          </p>
        }
      />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-10">
          <Section title="Your tasks" count={mine.length} action={<Link href="/tasks" className="text-ui text-ink-2 hover:text-ink">All tasks</Link>}>
            <TaskList tasks={mine.slice(0, 14)} empty="Nothing assigned to you right now." />
          </Section>
          {leading?.length ? (
            <Section title="Projects you lead" count={leading.length}>
              <ul>
                {leading.map((p) => {
                  const open = p.tasks.filter((t) => t.status !== "done");
                  const late = open.filter((t) => t.due_date && t.due_date < today).length;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="group grid min-h-10 grid-cols-[minmax(0,1.6fr)_90px_80px] items-center gap-4 border-b border-line py-2 text-ui last:border-b-0 hover:bg-bg"
                      >
                        <span className="truncate text-body font-medium group-hover:text-accent">{p.name}</span>
                        <span className="num text-ink-2">
                          {open.length} open
                          {late ? <span className="ml-1.5 font-medium text-crit">{late} late</span> : null}
                        </span>
                        <span className="text-right">{p.due_date ? <Due date={p.due_date} /> : <span className="text-ink-3">No date</span>}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ) : null}
        </div>
        <Section title="Activity">
          {activity.length ? <ActivityFeed items={activity} empty="" /> : <Empty>When people add or move tasks, it shows up here.</Empty>}
        </Section>
      </div>
    </>
  );
}
