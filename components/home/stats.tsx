import Link from "next/link";

/** A row of headline figures split by hairlines. Not cards: they're one reading, left to right. */
export function Stats({
  items,
}: {
  items: { label: string; value: string | number; tone?: "crit"; href?: string; note?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-4">
      {items.map((s, i) => {
        const inner = (
          <>
            <dt className="text-meta text-ink-3">{s.label}</dt>
            <dd className={`text-[26px] font-semibold leading-8 tracking-[-0.01em] ${s.tone === "crit" ? "text-crit" : ""}`}>{s.value}</dd>
            {s.note ? <dd className="text-meta text-ink-3">{s.note}</dd> : null}
          </>
        );
        const cls = `flex flex-col gap-0.5 px-4 py-3.5 ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line sm:border-t-0" : ""} ${i === 2 ? "pl-0 sm:border-l sm:pl-4" : ""} ${i === 0 ? "pl-0" : ""}`;
        return s.href ? (
          <Link key={s.label} href={s.href} className={`${cls} hover:bg-bg`}>
            {inner}
          </Link>
        ) : (
          <div key={s.label} className={cls}>
            {inner}
          </div>
        );
      })}
    </dl>
  );
}
