import Link from "next/link";
import { ActivityFeed } from "@/components/home/activity-feed";
import { Mentions } from "@/components/home/mentions";
import { TaskList } from "@/components/tasks/task-list";
import { PersonName } from "@/components/ui/avatar";
import { Due } from "@/components/ui/badges";
import { Empty, PageHeader, Section } from "@/components/ui/page";
import { Progress } from "@/components/ui/progress";
import { Stat, StatRow } from "@/components/ui/stats";
import { spendInMonth, summarize } from "@/lib/costs";
import { addDays, daysBetween, monthBounds, todayISO } from "@/lib/dates";
import { displayName, dueInfo, firstName, money, monthName, moneyRound, sinceLabel, todayHeading } from "@/lib/format";
import { QUIET_DAYS, projectHealth, type Health } from "@/lib/health";
import { PERSON, TASK_FIELDS, listMentions, listTasks, type ActivityRow } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

type Me = { id: string; full_name: string; email: string };

type Attention = {
  key: string;
  tag: "Late" | "Overdue" | "At risk" | "Renews" | "Unassigned";
  title: string;
  detail: string;
  aside: string;
  href: string;
};

const TAG_TONE: Record<Attention["tag"], string> = {
  Late: "bg-crit-soft text-crit",
  Overdue: "bg-crit-soft text-crit",
  "At risk": "bg-warn-soft text-warn",
  Renews: "bg-sunk text-ink-2",
  Unassigned: "bg-sunk text-ink-2",
};

const HEALTH: Record<Health, { label: string; cls: string; edge: string }> = {
  late: { label: "Late", cls: "text-crit", edge: "border-l-crit" },
  at_risk: { label: "At risk", cls: "text-warn", edge: "border-l-warn" },
  on_track: { label: "On track", cls: "text-good", edge: "border-l-good" },
};

const ATTENTION_LIMIT = 8;

/** Home for admins: what needs the owner, how each project is doing, what changed, and money in one line. */
export async function OwnerHome({ user, digestFrom }: { user: Me; digestFrom: string }) {
  const supabase = await createClient();
  const today = todayISO();
  const lastMonth = addDays(monthBounds(today).start, -1);

  const [{ data: projects }, { data: openTasks }, { data: costs }, { data: recent }, { data: digest }, mine, mentions] = await Promise.all([
    supabase
      .from("projects")
      .select(`id, name, due_date, client:clients(name), lead:profiles(${PERSON}), tasks(status, due_date)`)
      .eq("status", "active")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("tasks").select(TASK_FIELDS).neq("status", "done").order("due_date", { nullsFirst: false }).limit(300),
    supabase.from("costs").select("*, project:projects(id, name)"),
    supabase
      .from("activity")
      .select("project_id, created_at")
      .gte("created_at", addDays(today, -30))
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("activity")
      .select(`id, summary, action, entity_type, entity_id, created_at, meta, actor:profiles(${PERSON}), project:projects(id, name)`)
      .gte("created_at", digestFrom)
      .neq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    listTasks({ assigneeId: user.id }),
    listMentions(user.id, 5),
  ]);

  // Last activity per project, for spotting quiet ones.
  const lastActive = new Map<string, string>();
  for (const a of recent ?? []) if (a.project_id && !lastActive.has(a.project_id)) lastActive.set(a.project_id, a.created_at);

  const rows = (projects ?? []).map((p) => {
    const h = projectHealth(p, today);
    const last = lastActive.get(p.id);
    const quietDays = last ? daysBetween(todayISO(new Date(last)), today) : 30;
    return { ...p, ...h, quietDays, done: p.tasks.filter((t) => t.status === "done").length };
  });
  const order: Record<Health, number> = { late: 0, at_risk: 1, on_track: 2 };
  rows.sort((a, b) => order[a.health] - order[b.health]);

  // Needs attention, most urgent first.
  const attention: Attention[] = [];
  for (const p of rows.filter((r) => r.health === "late"))
    attention.push({ key: `p-${p.id}`, tag: "Late", title: p.name, detail: p.reason, aside: displayName(p.lead), href: `/projects/${p.id}` });
  for (const t of (openTasks ?? []).filter((t) => t.due_date && t.due_date < today))
    attention.push({
      key: `t-${t.id}`,
      tag: "Overdue",
      title: t.title,
      detail: `${t.assignee ? displayName(t.assignee) : "Unassigned"}, ${dueInfo(t.due_date!, today).label.toLowerCase()}`,
      aside: t.project?.name ?? "",
      href: `/projects/${t.project_id}?task=${t.id}`,
    });
  for (const p of rows.filter((r) => r.health === "at_risk"))
    attention.push({ key: `p-${p.id}`, tag: "At risk", title: p.name, detail: p.reason, aside: displayName(p.lead), href: `/projects/${p.id}` });
  const { renewals, runRate } = summarize(costs ?? [], today);
  for (const r of renewals.filter((r) => daysBetween(today, r.upcoming!) <= 7))
    attention.push({
      key: `c-${r.id}`,
      tag: "Renews",
      title: r.name,
      detail: dueInfo(r.upcoming!, today).label,
      aside: money(Number(r.amount)),
      href: "/money",
    });
  for (const t of (openTasks ?? []).filter((t) => !t.assignee_id && !(t.due_date && t.due_date < today)))
    attention.push({
      key: `u-${t.id}`,
      tag: "Unassigned",
      title: t.title,
      detail: t.due_date ? `Due ${dueInfo(t.due_date, today).label.toLowerCase()}` : "No due date",
      aside: t.project?.name ?? "",
      href: `/projects/${t.project_id}?task=${t.id}`,
    });

  const spentNow = spendInMonth(costs ?? [], today);
  const spentBefore = spendInMonth(costs ?? [], lastMonth);
  const nextRenewal = renewals[0];
  const since = sinceLabel(digestFrom);
  const changes = digest ?? [];
  const lateProjects = rows.filter((r) => r.health === "late").length;
  const riskProjects = rows.filter((r) => r.health === "at_risk").length;

  return (
    <>
      <PageHeader
        title={todayHeading()}
        meta={
          <p className="text-body text-ink-2">
            Hi {firstName(user)}.{" "}
            {attention.length
              ? `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} you.`
              : "Nothing needs you today."}{" "}
            {changes.length ? `${changes.length} ${changes.length === 1 ? "update" : "updates"} from the team ${since}.` : ""}
          </p>
        }
      />
      <StatRow>
        <Stat
          label="Needs you"
          value={attention.length}
          tone={attention.length ? "crit" : "good"}
          detail={attention.length ? "Late, overdue, unassigned, renewing" : "All clear"}
          href="#attention"
        />
        <Stat
          label="Active projects"
          value={rows.length}
          detail={lateProjects ? `${lateProjects} late` : riskProjects ? `${riskProjects} at risk` : "All on track"}
          tone={lateProjects ? "crit" : riskProjects ? "warn" : "ink"}
          href="/projects"
        />
        <Stat
          label={`${monthName(today)} spend`}
          value={moneyRound(spentNow)}
          detail={spentBefore > 0 ? spendChange(spentNow, spentBefore, monthName(lastMonth)) : "First month on record"}
          href="/money"
        />
        <Stat
          label="Subscriptions"
          value={moneyRound(runRate)}
          detail={nextRenewal ? `a month, next ${nextRenewal.name} ${dueInfo(nextRenewal.upcoming!, today).label.toLowerCase()}` : "a month"}
          href="/money"
        />
      </StatRow>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-12">
          <Section id="attention" title="Needs attention" count={attention.length}>
            {attention.length ? (
              <>
                <ul>
                  {attention.slice(0, ATTENTION_LIMIT).map((a) => (
                    <li key={a.key}>
                      <Link
                        href={a.href}
                        className="group grid min-h-11 grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2 hover:bg-bg"
                      >
                        <span className={`justify-self-start rounded-full px-2 py-0.5 text-meta font-medium ${TAG_TONE[a.tag]}`}>{a.tag}</span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-body group-hover:text-accent">{a.title}</span>
                          <span className="truncate text-meta text-ink-2">{a.detail}</span>
                        </span>
                        <span className="num max-w-36 truncate text-right text-ui text-ink-2">{a.aside}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {attention.length > ATTENTION_LIMIT ? (
                  <p className="pt-2 text-meta text-ink-3">
                    And {attention.length - ATTENTION_LIMIT} more. <Link href="/tasks?view=all" className="text-ink-2 hover:text-ink">See all open tasks</Link>
                  </p>
                ) : null}
              </>
            ) : (
              <Empty>Nothing late, nothing unassigned, no renewals this week.</Empty>
            )}
          </Section>

          <Section title="Projects" count={rows.length} action={<Link href="/projects" className="text-ui text-ink-2 hover:text-ink">All projects</Link>}>
            {rows.length ? (
              <div className="overflow-x-auto">
                <ul className="min-w-[560px]">
                  {rows.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className={`group grid min-h-12 grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_96px_72px_84px] items-center gap-4 border-b border-l-2 border-line py-2 pl-3 hover:bg-bg ${HEALTH[p.health].edge}`}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-body font-medium group-hover:text-accent">{p.name}</span>
                          <span className="truncate text-meta text-ink-3">
                            {p.client?.name ?? "Internal"}
                            {p.quietDays >= QUIET_DAYS ? (
                              <span className="text-warn">{`, quiet for ${p.quietDays >= 30 ? "30+" : p.quietDays} days`}</span>
                            ) : null}
                          </span>
                        </span>
                        <span className="min-w-0 text-ui">
                          <PersonName person={p.lead} />
                        </span>
                        <Progress done={p.done} total={p.tasks.length} tone={p.health} />
                        <span className="text-ui">{p.due_date ? <Due date={p.due_date} /> : <span className="text-ink-3">No date</span>}</span>
                        <span className={`text-right text-ui font-medium ${HEALTH[p.health].cls}`} title={p.reason}>
                          {HEALTH[p.health].label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Empty>No active projects.</Empty>
            )}
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-12">
          <Mentions items={mentions} newSince={digestFrom} />
          <Digest items={changes} since={since} />
          {mine.length ? (
            <Section title="Your tasks" count={mine.length} action={<Link href="/tasks" className="text-ui text-ink-2 hover:text-ink">All</Link>}>
              <TaskList tasks={mine.slice(0, 5)} grouped={false} empty="" />
            </Section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function spendChange(now: number, before: number, month: string) {
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return `Same as ${month}`;
  return `${Math.abs(pct)}% ${pct > 0 ? "up" : "down"} on ${month}`;
}

/** Changes by other people since the owner's last session, counted per project. */
function Digest({ items, since }: { items: ActivityRow[]; since: string }) {
  const byProject = new Map<string, { name: string; href: string | null; finished: number; added: number; comments: number; other: number }>();
  for (const a of items) {
    const key = a.project?.id ?? "none";
    const g = byProject.get(key) ?? { name: a.project?.name ?? "Clients and other", href: a.project ? `/projects/${a.project.id}` : null, finished: 0, added: 0, comments: 0, other: 0 };
    if (a.action === "completed") g.finished++;
    else if (a.action === "created" && a.entity_type === "task") g.added++;
    else if (a.action === "commented") g.comments++;
    else g.other++;
    byProject.set(key, g);
  }
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <Section title={`Since you last looked`} count={items.length}>
      {items.length ? (
        <div className="flex flex-col">
          <p className="pt-3 text-meta text-ink-3">Changes by the team {since}.</p>
          <ul className="pt-1">
            {[...byProject.values()].map((g) => {
              const parts = [
                g.finished && plural(g.finished, "finished", "finished"),
                g.added && plural(g.added, "added", "added"),
                g.comments && plural(g.comments, "comment", "comments"),
                g.other && plural(g.other, "other change", "other changes"),
              ].filter(Boolean);
              const inner = (
                <>
                  <span className="truncate text-body">{g.name}</span>
                  <span className="num shrink-0 text-meta text-ink-2">{parts.join(", ")}</span>
                </>
              );
              return (
                <li key={g.name}>
                  {g.href ? (
                    <Link href={g.href} className="flex items-baseline justify-between gap-3 border-b border-line py-2 hover:bg-bg hover:[&>span:first-child]:text-accent">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <details className="group pt-2">
            <summary className="cursor-pointer list-none text-ui text-ink-2 hover:text-ink">
              <span className="group-open:hidden">Show every update</span>
              <span className="hidden group-open:inline">Hide updates</span>
            </summary>
            <ActivityFeed items={items.slice(0, 40)} empty="" />
          </details>
        </div>
      ) : (
        <Empty>No changes from the team {since}. Your own edits don&apos;t show here.</Empty>
      )}
    </Section>
  );
}
