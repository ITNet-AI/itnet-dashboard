"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/field";
import { displayName } from "@/lib/format";
import type { Person } from "@/lib/queries";

/** A textarea where typing @ suggests teammates and inserts "@Full Name", which the server turns into a tag. */
export function MentionTextarea({ people, onKeyDown, ...props }: ComponentProps<"textarea"> & { people: Person[] }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<{ text: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  const listId = useId();

  const q = query?.text.toLowerCase() ?? "";
  const matches = query
    ? people
        .filter((p) => {
          const name = displayName(p).toLowerCase();
          return name.startsWith(q) || name.split(" ").some((w) => w.startsWith(q)) || p.email.toLowerCase().startsWith(q);
        })
        .slice(0, 6)
    : [];
  const open = matches.length > 0;

  /** Looks behind the caret for an @word being typed. */
  function track() {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const m = el.value.slice(0, caret).match(/(?:^|[^\p{L}\p{N}_])@([\p{L}\p{N}_.-]*)$/u);
    if (m && m[1] !== query?.text) setActive(0);
    setQuery(m ? { text: m[1], start: caret - m[1].length - 1 } : null);
  }

  function pick(p: Person) {
    const el = ref.current;
    if (!el || !query) return;
    const before = el.value.slice(0, query.start);
    const after = el.value.slice(el.selectionStart).replace(/^ /, "");
    const tag = `@${displayName(p)} `;
    el.value = before + tag + after;
    const caret = before.length + tag.length;
    el.focus();
    el.setSelectionRange(caret, caret);
    setQuery(null);
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onInput={track}
        onSelect={track}
        onBlur={() => setQuery(null)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              pick(matches[Math.min(active, matches.length - 1)]);
              return;
            }
            if (e.key === "Escape") {
              // Close the suggestions, not the dialog around the comments.
              e.preventDefault();
              e.stopPropagation();
              setQuery(null);
              return;
            }
          }
          onKeyDown?.(e);
        }}
        {...props}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Tag a teammate"
          className="absolute bottom-full left-0 z-20 mb-1 w-64 max-w-full overflow-hidden rounded-ctl border border-line-2 bg-surface py-1 shadow-[0_8px_24px_rgba(20,33,46,0.12)]"
        >
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the textarea must not blur first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-2.5 py-1.5 ${i === active ? "bg-sunk" : ""}`}
            >
              <Avatar person={p} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-ui font-medium text-ink">{displayName(p)}</span>
                <span className="truncate text-meta text-ink-3">{p.email}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
