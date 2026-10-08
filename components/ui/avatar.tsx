import { displayName, initials } from "@/lib/format";

type Person = { full_name: string; email: string } | null | undefined;

export function Avatar({ person, size = 20 }: { person: Person; size?: 20 | 24 | 28 }) {
  const text = size === 20 ? "text-[9.5px]" : "text-[11px]";
  if (!person) {
    return (
      <span
        title="Unassigned"
        style={{ width: size, height: size }}
        className="inline-block shrink-0 rounded-full border border-dashed border-line-2"
      />
    );
  }
  return (
    <span
      title={displayName(person)}
      style={{ width: size, height: size }}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-sunk font-semibold tracking-wide text-ink-2 ring-1 ring-line ${text}`}
    >
      {initials(person.full_name, person.email)}
    </span>
  );
}

export function PersonName({ person }: { person: Person }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar person={person} />
      <span className={`truncate ${person ? "" : "text-ink-3"}`}>{displayName(person)}</span>
    </span>
  );
}
