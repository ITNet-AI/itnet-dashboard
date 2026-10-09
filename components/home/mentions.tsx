import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ago, displayName } from "@/lib/format";
import type { MentionRow } from "@/lib/queries";

/** Comments that tag you, newest first. Ones since your last visit are marked new. Hidden when there are none. */
export function Mentions({ items, newSince }: { items: MentionRow[]; newSince: string }) {
  if (!items.length) return null;
  // Database and JS timestamps are formatted differently, so compare as times, not strings.
  const cutoff = new Date(newSince).getTime();
  const isNew = (m: MentionRow) => new Date(m.created_at).getTime() > cutoff;
  const fresh = items.filter(isNew).length;

  return (
    <Card title="Mentioned you" count={fresh || undefined}>
      <ul>
        {items.map((m) => {
          const href = m.task ? `/projects/${m.task.project_id}?task=${m.task.id}` : `/projects/${m.project?.id}#discussion`;
          const where = m.task?.title ?? m.project?.name ?? "";
          return (
            <li key={m.id}>
              <Link href={href} className="group flex gap-3 border-b border-line py-2.5 last:border-b-0">
                <Avatar person={m.author} size={24} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-ui">
                      <span className="font-semibold">{displayName(m.author)}</span>
                      <span className="text-ink-2"> on </span>
                      <span className="group-hover:text-accent">“{where}”</span>
                    </span>
                    <span className="ml-auto shrink-0 text-meta text-ink-3">
                      {isNew(m) ? <span className="mr-1.5 font-semibold text-accent">New</span> : null}
                      {ago(m.created_at)}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-meta text-ink-2">{m.body}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
