import Link from "@/components/ui/link";
import { ActivityFeed } from "@/components/home/activity-feed";
import { Attention, type AttentionItem } from "@/components/home/attention";
import { Mentions } from "@/components/home/mentions";
import { TaskList } from "@/components/tasks/task-list";
import { PersonName } from "@/components/ui/avatar";
import { Due } from "@/components/ui/badges";
import { Card, Quiet } from "@/components/ui/card";
import { GLYPH, Icon } from "@/components/ui/icons";
import { Empty, PageHeader } from "@/components/ui/page";
import { Progress } from "@/components/ui/progress";
import { Stat, StatRow, type Trend } from "@/components/ui/stats";
import { spendInMonth, summarize } from "@/lib/costs";
import { addDays, daysBetween, monthBounds, todayISO } from "@/lib/dates";
import { displayName, dueInfo, firstName, greeting, money, moneyRound, moneyShort, monthName, monthShort, sinceLabel, todayHeading } from "@/lib/format";
import { QUIET_DAYS, projectHealth, type Health } from "@/lib/health";
import { PERSON, listActiveProjects, listMentions, listPeople, listTasks, type ActivityRow } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

type Me = { id: string; full_name: string; email: string };

/* On track is the quiet default: a softened bar and a plain label, so only trouble gets colour and weight. */
const HEALTH: Record<Health, { label: string; cls: string; bar: string }> = {
  late: { label: "Late", cls: "font-semibold text-crit", bar: "bg-crit" },
  at_risk: { label: "At risk", cls: "font-semibold text-warn", bar: "bg-warn" },
  on_track: { label: "On track", cls: "text-ink-2", bar: "bg-good/55" },
};

/** Home for admins: what needs the owner, how each project is doing, what changed, and money in one line. */
export async function OwnerHome({ user, digestFrom }: { user: Me; digestFrom: string }) {
  const supabase = await createClient();
  const today = todayISO();
  const lastMonth = addDays(monthBounds(today).start, -1);

  const [projects, openTasks, { data: costs }, { data: digest }, mentions, people] = await Promise.all([
    listActiveProjects(),
    listTasks({}),
    supabase.from("costs").select("*, project:projects(id, name)"),
    supabase
      .from("activity")
      .select(`id, summary, action, entity_type, entity_id, created_at, meta, actor:profiles(${PERSON}), project:projects(id, name)`)
      .gte("created_at", digestFrom)
      .neq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    listMentions(user.id, 5),
    listPeople(),
  ]);
  // Your own list is a slice of the open tasks already fetched; no second tasks query.
  const mine = openTasks.filter((t) => t.assignee_id === user.id);
  // Soonest due first, undated last, for the attention list.
  const byDue = [...openTasks].sort((a, b) => (a.due_date ?? "~").localeCompare(b.due_date ?? "~"));

  const rows = projects.map((p) => {
    const h = projectHealth(p, today);
    const last = p.activity[0]?.created_at;
    const quietDays = last ? daysBetween(todayISO(new Date(last)), today) : 30;
    return { ...p, ...h, quietDays, done: p.tasks.filter((t) => t.status === "done").length };
  });
  const order: Record<Health, number> = { late: 0, at_risk: 1, on_track: 2 };
  rows.sort((a, b) => order[a.health] - order[b.health]);

  // Needs attention, by severity: overdue (late projects, then overdue tasks), at risk, unassigned, renewals.
  const attention: AttentionItem[] = [];
  const projectItem = (p: (typeof rows)[number], kind: "overdue" | "at_risk", label: string): AttentionItem => ({
    key: `p-${p.id}`,
    kind,
    label,
    title: p.name,
    detail: p.reason,
    aside: displayName(p.lead),
    href: `/projects/${p.id}`,
    project: { id: p.id, name: p.name },
    assignee: null,
    taskId: null,
  });
  const taskItem = (t: (typeof openTasks)[number], kind: "overdue" | "unassigned", detail: string): AttentionItem => ({
    key: `t-${t.id}`,
    kind,
    label: kind === "overdue" ? "Overdue" : "Unassigned",
    title: t.title,
    detail,
    aside: "",
    href: `/projects/${t.project_id}?task=${t.id}`,
    project: t.project,
    assignee: t.assignee,
    taskId: t.id,
  });
  for (const p of rows.filter((r) => r.health === "late")) attention.push(projectItem(p, "overdue", "Late"));
  for (const t of byDue.filter((t) => t.due_date && t.due_date < today))
    attention.push(taskItem(t, "overdue", `${t.assignee ? displayName(t.assignee) : "Nobody on it"}, ${dueInfo(t.due_date!, today).label.toLowerCase()}`));
  for (const p of rows.filter((r) => r.health === "at_risk")) attention.push(projectItem(p, "at_risk", "At risk"));
  for (const t of byDue.filter((t) => !t.assignee_id && !(t.due_date && t.due_date < today)))
    attention.push(taskItem(t, "unassigned", t.due_date ? `Due ${dueInfo(t.due_date, today).label.toLowerCase()}` : "No due date"));
  const { renewals, runRate } = summarize(costs ?? [], today);
  for (const r of renewals.filter((r) => daysBetween(today, r.upcoming!) <= 7))
    attention.push({
      key: `c-${r.id}`,
      kind: "renews",
      label: "Renews",
      title: r.name,
      detail: dueInfo(r.upcoming!, today).label,
      aside: money(Number(r.amount)),
      href: "/money",
      project: r.project,
      assignee: null,
      taskId: null,
    });

  const spentNow = spendInMonth(costs ?? [], today);
  const spentBefore = spendInMonth(costs ?? [], lastMonth);
  const nextRenewal = renewals[0];
  const since = sinceLabel(digestFrom);
  const changes = digest ?? [];
  const lateProjects = rows.filter((r) => r.health === "late").length;
  const riskProjects = rows.filter((r) => r.health === "at_risk").length;
  const onFire = attention.filter((a) => a.kind === "overdue").length;
  const canWait = attention.length - onFire;

  // Today's focus is your own list minus what Needs attention already shows, so nothing is said twice.
  const shownTaskIds = new Set(attention.map((a) => a.taskId).filter(Boolean));
  const focus = mine.filter((t) => !shownTaskIds.has(t.id)).slice(0, 8);
  const sharedCount = mine.length - mine.filter((t) => !shownTaskIds.has(t.id)).length;

  return (
    <div data-wash="" className="flex flex-col">
      <PageHeader
        title={`${greeting()}, ${firstName(user)}`}
        meta={
          <p className="text-body text-ink-2">
            <span className="text-ink-3">{todayHeading()}.</span> {fireLine(onFire, canWait)}
            {changes.length ? ` ${changes.length} ${changes.length === 1 ? "update" : "updates"} from the team ${since}.` : ""}
          </p>
        }
      />
      <StatRow>
        <Stat
          label="Needs you"
          value={attention.length}
          tone={onFire ? "crit" : attention.length ? "warn" : "good"}
          icon={<Icon>{onFire ? GLYPH.flame : attention.length ? GLYPH.clock : GLYPH.check}</Icon>}
          detail={onFire ? `${onFire} urgent, ${canWait} can wait` : attention.length ? "Nothing urgent, all of it can wait" : "All clear, nothing waiting"}
          href="#attention"
        />
        <Stat
          label="Active projects"
          value={rows.length}
          tone={lateProjects ? "crit" : riskProjects ? "warn" : rows.length ? "good" : "accent"}
          icon={<Icon>{GLYPH.folder}</Icon>}
          detail={lateProjects ? `${lateProjects} late` : riskProjects ? `${riskProjects} at risk` : rows.length ? "All on track" : "None yet"}
          href="/projects"
        />
        <Stat
          label={`${monthName(today)} spend`}
          value={moneyRound(spentNow)}
          tone="ink"
          icon={<Icon>{GLYPH.rupee}</Icon>}
          trend={spentBefore > 0 ? spendTrend(spentNow, spentBefore, monthShort(lastMonth)) : undefined}
          detail="First month on record"
          href="/money"
        />
        <Stat
          label="Subscriptions"
          value={moneyRound(runRate)}
          tone="plum"
          icon={<Icon>{GLYPH.repeat}</Icon>}
          detail={nextRenewal ? `a month, next ${nextRenewal.name} ${dueInfo(nextRenewal.upcoming!, today).label.toLowerCase()}` : "a month"}
          href="/money"
        />
      </StatRow>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card id="attention" title="Needs attention" count={attention.length} flush>
            {attention.length ? (
              <Attention items={attention} people={people} currentUserId={user.id} />
            ) : (
              <Quiet tone="good" icon={<Icon>{GLYPH.check}</Icon>} title="All clear">
                Nothing late, nothing unassigned, no renewals this week. Enjoy the quiet.
              </Quiet>
            )}
          </Card>

          <Card title="Projects" count={rows.length} action={<Link href="/projects" className="text-ui text-ink-2 hover:text-ink">All projects</Link>} flush>
            {rows.length ? (
              <div className="overflow-x-auto border-t border-line">
                <ul className="min-w-[560px]">
                  {rows.map((p) => (
                    <li key={p.id} className="relative">
                      <span aria-hidden="true" className={`absolute inset-y-3 left-2 w-[3px] rounded-full ${HEALTH[p.health].bar}`} />
                      <Link
                        href={`/projects/${p.id}`}
                        className="group grid min-h-16 grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_96px_72px_80px] items-center gap-4 border-b border-line py-3 pr-4 pl-5 transition-colors last:rounded-b-dlg last:border-b-0 hover:bg-sunk"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-body group-hover:text-accent">{p.name}</span>
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
                        <span className={`text-right text-ui ${HEALTH[p.health].cls}`} title={p.reason}>
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
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {mine.length ? (
            <Card title="Today's focus" count={focus.length || undefined} action={<Link href="/tasks" className="text-ui text-ink-2 hover:text-ink">All</Link>}>
              {focus.length ? (
                <TaskList tasks={focus} grouped={false} progress stacked empty="" />
              ) : (
                <p className="py-3 text-ui text-ink-3">Everything on your list is already in Needs attention.</p>
              )}
              {sharedCount && focus.length ? (
                <p className="pt-3 text-meta text-ink-3">
                  {sharedCount} more of yours {sharedCount === 1 ? "is" : "are"} in Needs attention.
                </p>
              ) : null}
            </Card>
          ) : null}
          <Mentions items={mentions} newSince={digestFrom} />
          <Digest items={changes} since={since} />
        </div>
      </div>
    </div>
  );
}

function fireLine(onFire: number, canWait: number): string {
  const things = (n: number) => `${n} ${n === 1 ? "thing" : "things"}`;
  if (onFire && canWait) return `${things(onFire)} ${onFire === 1 ? "is" : "are"} on fire, ${canWait} can wait.`;
  if (onFire) return `${things(onFire)} ${onFire === 1 ? "is" : "are"} on fire, nothing else is waiting.`;
  if (canWait) return `Nothing's on fire. ${things(canWait)} can wait.`;
  return "Nothing's on fire and nothing's waiting.";
}

/**
 * Month on month. A percentage only when the baseline is big enough to make it mean something;
 * a tiny September next to a normal October would otherwise read as "4446% up", which looks like a bug.
 */
function spendTrend(now: number, before: number, month: string): Trend {
  const diff = now - before;
  if (diff === 0) return { dir: "flat", label: `Same as ${month}` };
  const pct = Math.round((diff / before) * 100);
  const dir = diff > 0 ? "up" : "down";
  if (Math.abs(pct) > 200) return { dir, label: `${moneyShort(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than ${month}` };
  return { dir, label: `${Math.abs(pct)}% ${dir} on ${month}` };
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
    <Card title="Since you last looked" count={items.length || undefined}>
      {items.length ? (
        <div className="flex flex-col">
          <p className="text-meta text-ink-3">Changes by the team {since}.</p>
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
                    <Link href={g.href} className="flex items-baseline justify-between gap-3 border-b border-line py-2 hover:[&>span:first-child]:text-accent">
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
        <Quiet icon={<Icon>{GLYPH.moon}</Icon>} title={`All quiet ${since}`}>
          Nobody has moved a thing. Either everyone is heads-down or everyone is at lunch. Your own edits don&apos;t count here.
        </Quiet>
      )}
    </Card>
  );
}
