import { displayName } from "@/lib/format";

type Named = { id: string; full_name: string; email: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A comment body as plain text and the people tagged in it with @Name.
 * Names match case-insensitively, longest first, so "@Dev Devadath" wins over "@Dev".
 * An @ inside a word (an email address) is not a tag.
 */
export function splitMentions<P extends Named>(body: string, people: P[]): (string | P)[] {
  const named = people
    .map((p) => ({ p, name: displayName(p).toLowerCase() }))
    .filter((n) => n.name)
    .sort((a, b) => b.name.length - a.name.length);
  if (!named.length) return [body];

  const re = new RegExp(`(?<![\\p{L}\\p{N}_])@(${named.map((n) => escape(n.name)).join("|")})(?![\\p{L}\\p{N}_])`, "giu");
  const out: (string | P)[] = [];
  let last = 0;
  for (const m of body.matchAll(re)) {
    const person = named.find((n) => n.name === m[1].toLowerCase())!.p;
    if (m.index > last) out.push(body.slice(last, m.index));
    out.push(person);
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

/** Ids of everyone tagged in the body, once each. */
export function findMentions(body: string, people: Named[]): string[] {
  return [...new Set(splitMentions(body, people).flatMap((s) => (typeof s === "string" ? [] : [s.id])))];
}
