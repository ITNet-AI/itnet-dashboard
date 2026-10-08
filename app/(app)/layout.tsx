import { Sidebar } from "@/components/nav/sidebar";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar user={{ full_name: user.full_name, email: user.email, is_admin: user.is_admin }} />
      <main className="min-w-0 flex-1 bg-surface md:my-2 md:mr-2 md:rounded-dlg md:ring-1 md:ring-line">
        <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-8 md:py-9">{children}</div>
      </main>
    </div>
  );
}
