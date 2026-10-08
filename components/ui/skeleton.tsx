/**
 * A quiet placeholder in the shape of a typical page: display-size title, then rows.
 * Same spacing as PageHeader and Section so the real page lands without a jump.
 */
export function Skeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <header className="flex flex-col gap-3 pb-6">
        <div className="h-9 w-48 rounded-ctl bg-sunk" />
      </header>
      <div className="h-8 border-b border-line" />
      <ul>
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex h-11 items-center gap-4 border-b border-line">
            <span className="h-3.5 rounded-sm bg-sunk" style={{ width: `${34 + ((i * 17) % 28)}%` }} />
            <span className="ml-auto h-3 w-16 rounded-sm bg-sunk" />
          </li>
        ))}
      </ul>
    </div>
  );
}
