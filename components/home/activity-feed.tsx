import Link from "@/components/ui/link";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/page";
import { ago, displayName } from "@/lib/format";
import type { ActivityRow } from "@/lib/queries";

function href(item: ActivityRow): string | null {
  const meta = (item.meta ?? {}) as { task_id?: string | null };
  if (item.entity_type === "task" && item.project && item.action !== "deleted") return `/projects/${item.project.id}?task=${item.entity_id}`;
  if (item.entity_type === "comment" && item.project && meta.task_id) return `/projects/${item.project.id}?task=${meta.task_id}`;
  if (item.project) return `/projects/${item.project.id}`;
  if (item.entity_type === "client") return `/clients/${item.entity_id}`;
  return null;
}

export function ActivityFeed({ items, showProject = true, empty }: { items: ActivityRow[]; showProject?: boolean; empty: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <ol className="flex flex-col">
      {items.map((item) => {
        const link = href(item);
        const meta = (item.meta ?? {}) as { excerpt?: string };
        const body = (
          <>
            <span className="text-ink">
              <span className="font-medium">{displayName(item.actor)}</span> {item.summary}
            </span>
            {meta.excerpt ? <span className="line-clamp-1 text-ink-2">{meta.excerpt}</span> : null}
            <span className="text-meta text-ink-3">
              {showProject && item.project ? `${item.project.name}, ` : ""}
              <time dateTime={item.created_at}>{ago(item.created_at)}</time>
            </span>
          </>
        );
        return (
          <li key={item.id} className="flex gap-3 border-b border-line py-2.5 last:border-b-0">
            <span className="pt-0.5">
              <Avatar person={item.actor} />
            </span>
            {link ? (
              <Link href={link} className="flex min-w-0 flex-col gap-0.5 text-ui hover:[&>span:first-child]:text-accent">
                {body}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-col gap-0.5 text-ui">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
