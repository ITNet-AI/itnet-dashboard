"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { displayName } from "@/lib/format";

type Item = { href: string; label: string };

const MAIN: Item[] = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/clients", label: "Clients" },
];
const ADMIN: Item[] = [
  { href: "/money", label: "Money" },
  { href: "/team", label: "Team" },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function NavLink({ item, path }: { item: Item; path: string }) {
  const active = isActive(path, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 shrink-0 items-center rounded-ctl px-2.5 text-body ${
        active ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:bg-sunk hover:text-ink"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function Sidebar({ user }: { user: { full_name: string; email: string; is_admin: boolean } }) {
  const path = usePathname();
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[216px] shrink-0 flex-col justify-between px-3 py-6 md:flex">
        <div className="flex flex-col gap-7">
          <Link href="/" className="-ml-1 px-2.5" aria-label="Home">
            <Logo height={30} />
          </Link>
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {MAIN.map((i) => (
              <NavLink key={i.href} item={i} path={path} />
            ))}
          </nav>
          {user.is_admin ? (
            <nav className="flex flex-col gap-0.5" aria-label="Admin">
              <p className="px-2.5 pb-1 text-meta text-ink-3">Admin</p>
              {ADMIN.map((i) => (
                <NavLink key={i.href} item={i} path={path} />
              ))}
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5 px-2.5">
          <Avatar person={user} size={28} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-ui font-medium">{displayName(user)}</span>
            <form action={signOut}>
              <button type="submit" className="text-meta text-ink-3 hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Phone */}
      <div className="sticky top-0 z-10 border-b border-line bg-bg md:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link href="/" aria-label="Home">
            <Logo height={26} />
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-meta text-ink-3 hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2" aria-label="Main">
          {[...MAIN, ...(user.is_admin ? ADMIN : [])].map((i) => (
            <NavLink key={i.href} item={i} path={path} />
          ))}
        </nav>
      </div>
    </>
  );
}
