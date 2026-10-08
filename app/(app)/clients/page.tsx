import type { Metadata } from "next";
import Link from "next/link";
import { ClientForm } from "@/components/clients/client-form";
import { Empty, PageHeader } from "@/components/ui/page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, name, contact_name, contact_email, projects(status)").order("name");
  const clients = data ?? [];
  const cols = "grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_110px_90px]";

  return (
    <>
      <PageHeader title="Clients" figure={clients.length}>
        <ClientForm />
      </PageHeader>
      {clients.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className={`colhead grid ${cols} gap-4 border-b border-line py-2`}>
              <span>Client</span>
              <span>Contact</span>
              <span className="text-right">Active projects</span>
              <span className="text-right">All projects</span>
            </div>
            <ul>
              {clients.map((c) => (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className={`group grid ${cols} min-h-11 items-center gap-4 border-b border-line py-2 text-body hover:bg-bg`}>
                    <span className="truncate font-medium group-hover:text-accent">{c.name}</span>
                    <span className="flex min-w-0 flex-col text-ui">
                      <span className="truncate">{c.contact_name ?? <span className="text-ink-3">No contact</span>}</span>
                      {c.contact_email ? <span className="truncate text-meta text-ink-3">{c.contact_email}</span> : null}
                    </span>
                    <span className="num text-right">{c.projects.filter((p) => p.status === "active").length}</span>
                    <span className="num text-right text-ink-2">{c.projects.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <Empty action={<ClientForm />}>No clients yet. Add one, then attach projects to it.</Empty>
      )}
    </>
  );
}
