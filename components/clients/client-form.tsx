"use client";

import { useActionState, useState } from "react";
import { createClientRecord, updateClientRecord } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Textarea } from "@/components/ui/field";
import type { Tables } from "@/lib/database.types";

export function ClientForm({ client }: { client?: Tables<"clients"> }) {
  const [open, setOpen] = useState(false);
  const save = client ? updateClientRecord : createClientRecord;
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof save>>, fd: FormData) => {
    const result = await save(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  }, null);

  return (
    <>
      <Button variant={client ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {client ? "Edit client" : "New client"}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={client ? "Edit client" : "New client"}>
        <form action={action} className="flex flex-col gap-4">
          {client ? <input type="hidden" name="id" value={client.id} /> : null}
          <Field label="Name" htmlFor="client-name">
            <Input id="client-name" name="name" defaultValue={client?.name} required autoFocus />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Contact person" htmlFor="client-contact">
              <Input id="client-contact" name="contact_name" defaultValue={client?.contact_name ?? ""} autoComplete="off" />
            </Field>
            <Field label="Contact email" htmlFor="client-email">
              <Input id="client-email" name="contact_email" type="email" defaultValue={client?.contact_email ?? ""} autoComplete="off" />
            </Field>
          </div>
          <Field label="Notes" htmlFor="client-notes">
            <Textarea
              id="client-notes"
              name="notes"
              rows={4}
              defaultValue={client?.notes ?? ""}
              placeholder="Billing terms, how they like to be updated, anything the next person should know"
            />
          </Field>
          <FormError message={state?.error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : client ? "Save changes" : "Create client"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
