import { displayName, initials } from "@/lib/format";

type Person = { full_name: string; email: string } | null | undefined;

/* Eight hues that stay apart from the brand red and blue and from the status colours. */
const HUES = [20, 50, 85, 130, 175, 215, 265, 310];

/** Soft tint and legible ink in the same hue, both faces, keyed on the email so it is stable everywhere. */
function tint(email: string) {
  let h = 0;
  for (const c of email.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return {
    background: `light-dark(oklch(0.93 0.045 ${hue}), oklch(0.32 0.055 ${hue}))`,
    color: `light-dark(oklch(0.42 0.11 ${hue}), oklch(0.86 0.08 ${hue}))`,
  };
}

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
      style={{ width: size, height: size, ...tint(person.email) }}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide ${text}`}
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
