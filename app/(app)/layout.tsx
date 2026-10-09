import { cookies } from "next/headers";
import { NAV_COOKIE, Sidebar } from "@/components/nav/sidebar";
import { THEME_COOKIE } from "@/components/ui/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { listNavProjects } from "@/lib/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, projects, cookieStore] = await Promise.all([getCurrentUser(), listNavProjects(), cookies()]);
  const collapsed = cookieStore.get(NAV_COOKIE)?.value === "1";
  const theme = cookieStore.get(THEME_COOKIE)?.value;
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        user={{ full_name: user.full_name, email: user.email, is_admin: user.is_admin }}
        projects={projects}
        initialCollapsed={collapsed}
        initialTheme={theme === "light" || theme === "dark" ? theme : undefined}
      />
      <div aria-hidden="true" className="brand-strip-v sticky top-0 hidden h-dvh shrink-0 md:grid" />
      {/* Home marks itself data-wash and gets the grey ground for its cards; every other page keeps the white surface. */}
      <main className="min-w-0 flex-1 bg-surface pb-16 has-[[data-wash]]:bg-bg md:my-2 md:mr-2 md:rounded-r-dlg md:pb-0">
        <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-8 md:py-9">{children}</div>
      </main>
    </div>
  );
}
