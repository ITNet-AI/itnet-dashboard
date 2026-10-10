import type { Metadata } from "next";
import { after } from "next/server";
import Link from "@/components/ui/link";
import { ActivityFeed } from "@/components/home/activity-feed";
import { Mentions } from "@/components/home/mentions";
import { OwnerHome } from "@/components/home/owner-home";
import { TaskList } from "@/components/tasks/task-list";
import { Due } from "@/components/ui/badges";
import { buttonClass } from "@/components/ui/button";
import { Card, Quiet } from "@/components/ui/card";
import { GLYPH, Icon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page";
import { Stat, StatRow } from "@/components/ui/stats";
import { getCurrentUser } from "@/lib/auth";
import { daysBetween, todayISO } from "@/lib/dates";
import { firstName, greeting, todayHeading } from "@/lib/format";
import { listActivity, listMentions, listTasks } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { digestStart, recordHomeVisit } from "@/lib/visits";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const digestFrom = digestStart(user);
  // The visit stamp is written after the response; cookies can't be read inside after(), so the client is made here.
  const supabase = await createClient();
  after(() => recordHomeVisit(supabase, user.id, digestFrom));
  if (user.is_admin) return <OwnerHome user={user} digestFrom={digestFrom} />;
  return <MemberHome user={user} digestFrom={digestFrom} />;
}

/** Home for members: their own work first, then what the team is doing. */
async function MemberHome({ user, digestFrom }: { user: { id: string; full_name: string; email: string }; digestFrom: string }) {
  const supabase = await createClient();
  const today = todayISO();

  const [mine, activity, mentions, { data: leading }] = await Promise.all([
    listTasks({ assigneeId: user.id }),
    listActivity(25),
    listMentions(user.id, 5),
    supabase
      .from("projects")
      .select("id, name, due_date, tasks(status, due_date)")
      .eq("status", "active")
      .eq("lead_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const overdue = mine.filter((t) => t.due_date && t.due_date < today).length;
  const dueThisWeek = mine.filter((t) => t.due_date && t.due_date >= today && daysBetween(today, t.due_date) <= 7).length;
  const lead = leading ?? [];
  const leadLate = lead.filter((p) => p.tasks.some((t) => t.status !== "done" && t.due_date && t.due_date < today)).length;

  return (
    <div data-wash="" className="flex flex-col">
      <PageHeader
        title={`${greeting()}, ${firstName(user)}`}
        meta={
          <p className="text-body text-ink-2">
            <span className="text-ink-3">{todayHeading()}.</span>{" "}
            {overdue ? `${overdue} ${overdue === 1 ? "task is" : "tasks are"} overdue, ${mine.length - overdue} can wait.` : mine.length ? "Nothing's late. Here is where you stand." : "Nothing on your plate."}
          </p>
        }
      />
      <StatRow>
        <Stat label="Open tasks" value={mine.length} tone="accent" icon={<Icon>{GLYPH.check}</Icon>} detail="assigned to you" href="/tasks" />
        <Stat label="Due this week" value={dueThisWeek} tone={dueThisWeek ? "warn" : "ink"} icon={<Icon>{GLYPH.clock}</Icon>} detail="including today" href="/tasks" />
        <Stat
          label="Overdue"
          value={overdue}
          tone={overdue ? "crit" : "good"}
          icon={<Icon>{overdue ? GLYPH.flame : GLYPH.check}</Icon>}
          detail={overdue ? "needs a new date or a push" : "nothing late"}
          href="/tasks"
        />
        {lead.length ? (
          <Stat
            label="Projects you lead"
            value={lead.length}
            tone={leadLate ? "crit" : "ink"}
            icon={<Icon>{GLYPH.folder}</Icon>}
            detail={leadLate ? `${leadLate} with late tasks` : "all on track"}
            href="#leading"
          />
        ) : null}
      </StatRow>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Your tasks" count={mine.length} action={<Link href="/tasks" className="text-ui text-ink-2 hover:text-ink">All tasks</Link>}>
            <TaskList
              tasks={mine.slice(0, 14)}
              empty="Nothing assigned to you right now. Pick something up from a project board."
              emptyAction={
                <Link href="/projects" className={buttonClass("primary")}>
                  Browse projects
                </Link>
              }
            />
          </Card>
          {lead.length ? (
            <Card id="leading" title="Projects you lead" count={lead.length}>
              <ul>
                {lead.map((p) => {
                  const open = p.tasks.filter((t) => t.status !== "done");
                  const late = open.filter((t) => t.due_date && t.due_date < today).length;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="group grid min-h-10 grid-cols-[minmax(0,1.6fr)_90px_80px] items-center gap-4 border-b border-line py-2 text-ui last:border-b-0"
                      >
                        <span className="truncate text-body group-hover:text-accent">{p.name}</span>
                        <span className="num text-ink-2">
                          {open.length} open
                          {late ? <span className="ml-1.5 font-semibold text-crit">{late} late</span> : null}
                        </span>
                        <span className="text-right">{p.due_date ? <Due date={p.due_date} /> : <span className="text-ink-3">No date</span>}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Mentions items={mentions} newSince={digestFrom} />
          <Card title="Activity">
            {activity.length ? (
              <ActivityFeed items={activity} empty="" />
            ) : (
              <Quiet icon={<Icon>{GLYPH.moon}</Icon>} title="All quiet">
                When people add or move tasks, it shows up here.
              </Quiet>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
