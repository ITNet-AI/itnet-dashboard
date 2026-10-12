/**
 * A same-origin path to continue to after sign-in, or "/". Resolving against the origin catches the tricks a prefix check
 * misses, such as "//evil.com" and "/\\evil.com", which browsers treat as another host.
 */
export function safeNext(value: string | null | undefined, origin: string): string {
  if (!value || !value.startsWith("/")) return "/";
  try {
    const base = new URL(origin).origin;
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}
