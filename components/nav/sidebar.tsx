"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOut } from "@/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle, type Theme } from "@/components/ui/theme-toggle";
import { displayName } from "@/lib/format";
import type { Health } from "@/lib/health";

/** Set to "1" when the desktop sidebar is collapsed to a rail, so the first paint matches. */
export const NAV_COOKIE = "nav";

type Item = { href: string; label: string; icon: ReactNode };
type NavProject = { id: string; name: string; health: Health };

const ICONS = {
  home: (
    <>
      <path d="M2.5 7.5 8 3l5.5 4.5" />
      <path d="M4 7v6h8V7" />
    </>
  ),
  projects: (
    <>
      <path d="M2.5 5.5h11v7.5h-11z" />
      <path d="M2.5 5.5V3.5h4l1.5 2" />
    </>
  ),
  tasks: (
    <>
      <path d="M2.5 4.5 4 6l3-3" />
      <path d="M9 4.5h4.5" />
      <path d="M2.5 10.5 4 12l3-3" />
      <path d="M9 10.5h4.5" />
    </>
  ),
  clients: (
    <>
      <path d="M3.5 13.5V3.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v10" />
      <path d="M10.5 7h2a1 1 0 0 1 1 1v5.5" />
      <path d="M2 13.5h12" />
      <path d="M6 5.5h2M6 8h2M6 10.5h2" />
    </>
  ),
  money: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M6 6h4M6 8h4M6.5 8c1.5 0 2.5.5 3.5 2.5" />
    </>
  ),
  team: (
    <>
      <circle cx="6" cy="5.5" r="2.25" />
      <path d="M1.75 13c.5-2.3 2.1-3.5 4.25-3.5s3.75 1.2 4.25 3.5" />
      <path d="M10.5 3.5a2.25 2.25 0 0 1 0 4.4M12 9.6c1.3.5 2 1.6 2.25 3.4" />
    </>
  ),
};

const MAIN: Item[] = [
  { href: "/", label: "Home", icon: ICONS.home },
  { href: "/projects", label: "Projects", icon: ICONS.projects },
  { href: "/tasks", label: "Tasks", icon: ICONS.tasks },
  { href: "/clients", label: "Clients", icon: ICONS.clients },
];
const ADMIN: Item[] = [
  { href: "/money", label: "Money", icon: ICONS.money },
  { href: "/team", label: "Team", icon: ICONS.team },
];

const HEALTH_DOT: Record<Health, string> = { late: "bg-crit", at_risk: "bg-warn", on_track: "bg-good" };
const HEALTH_LABEL: Record<Health, string> = { late: "Late", at_risk: "At risk", on_track: "On track" };

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function NavLink({ item, path, collapsed = false }: { item: Item; path: string; collapsed?: boolean }) {
  const active = isActive(path, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`flex h-8 shrink-0 items-center gap-2.5 rounded-ctl text-body ${collapsed ? "justify-center px-0" : "px-2.5"} ${
        active ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:bg-sunk hover:text-ink"
      }`}
    >
      <span className={active ? "text-ink" : "text-ink-3"}>
        <Icon>{item.icon}</Icon>
      </span>
      {collapsed ? null : item.label}
    </Link>
  );
}

function ProjectLinks({ projects, path }: { projects: NavProject[]; path: string }) {
  if (!projects.length) return null;
  return (
    <ul className="ml-[18px] flex flex-col gap-0.5 border-l border-line pl-2.5" aria-label="Active projects">
      {projects.map((p) => {
        const href = `/projects/${p.id}`;
        const active = isActive(path, href);
        return (
          <li key={p.id}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              title={`${p.name}, ${HEALTH_LABEL[p.health].toLowerCase()}`}
              className={`flex h-7 items-center gap-2 rounded-ctl px-2 text-ui ${
                active ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:bg-sunk hover:text-ink"
              }`}
            >
              <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${HEALTH_DOT[p.health]}`} />
              <span className="truncate">{p.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      className="grid size-7 shrink-0 place-items-center rounded-ctl text-ink-3 hover:bg-sunk hover:text-ink"
    >
      <Icon>
        <path d="M3 2.5h10v11H3z" />
        <path d="M6.5 2.5v11" />
        <path d={collapsed ? "M9 6.5 10.5 8 9 9.5" : "M11 6.5 9.5 8 11 9.5"} />
      </Icon>
    </button>
  );
}

export function Sidebar({
  user,
  projects,
  initialCollapsed,
  initialTheme,
}: {
  user: { full_name: string; email: string; is_admin: boolean };
  projects: NavProject[];
  initialCollapsed: boolean;
  initialTheme?: Theme;
}) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const items = [...MAIN, ...(user.is_admin ? ADMIN : [])];

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${NAV_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <>
      {/* Desktop */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col justify-between py-6 transition-[width] duration-150 ease-out md:flex ${
          collapsed ? "w-14 px-2" : "w-[216px] px-3"
        }`}
      >
        <div className="flex min-h-0 flex-col gap-7">
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between pl-1.5"}`}>
            {collapsed ? null : (
              <Link href="/" aria-label="Home">
                <Logo height={30} />
              </Link>
            )}
            <CollapseButton collapsed={collapsed} onClick={toggle} />
          </div>
          <nav className="flex flex-col gap-0.5" aria-label="Main">
            {MAIN.map((i) => (
              <div key={i.href} className="flex flex-col gap-0.5">
                <NavLink item={i} path={path} collapsed={collapsed} />
                {i.href === "/projects" && !collapsed ? <ProjectLinks projects={projects} path={path} /> : null}
              </div>
            ))}
          </nav>
          {user.is_admin ? (
            <nav className="flex flex-col gap-0.5" aria-label="Admin">
              {collapsed ? <hr className="mx-2 mb-1 border-line" /> : <p className="px-2.5 pb-1 text-meta text-ink-3">Admin</p>}
              {ADMIN.map((i) => (
                <NavLink key={i.href} item={i} path={path} collapsed={collapsed} />
              ))}
            </nav>
          ) : null}
        </div>
        <div className={`flex items-center gap-2.5 ${collapsed ? "flex-col" : "px-2.5"}`}>
          <Avatar person={user} size={28} />
          {collapsed ? null : (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-ui font-medium">{displayName(user)}</span>
              <form action={signOut}>
                <button type="submit" className="text-meta text-ink-3 hover:text-ink">
                  Sign out
                </button>
              </form>
            </div>
          )}
          <ThemeToggle initial={initialTheme} />
        </div>
      </aside>

      {/* Phone: logo and sign out on top, tabs along the bottom edge above the brand strip. */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg px-4 py-3 md:hidden">
        <Link href="/" aria-label="Home">
          <Logo height={26} />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle initial={initialTheme} />
          <form action={signOut}>
            <button type="submit" className="text-meta text-ink-3 hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-[3px] z-20 grid h-14 border-t border-line bg-bg/95 backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        aria-label="Main"
      >
        {items.map((i) => {
          const active = isActive(path, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] leading-none ${
                active ? "font-medium text-ink" : "text-ink-3"
              }`}
            >
              <Icon>{i.icon}</Icon>
              {i.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
