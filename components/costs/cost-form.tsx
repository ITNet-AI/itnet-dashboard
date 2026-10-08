"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteCost, saveCost } from "@/actions/costs";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import type { Tables } from "@/lib/database.types";

type Cost = Tables<"costs">;

export function CostDialog({
  open,
  onClose,
  cost,
  projects,
  defaultProjectId,
  defaultKind = "recurring",
}: {
  open: boolean;
  onClose: () => void;
  cost?: Cost | null;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  defaultKind?: "one_time" | "recurring";
}) {
  const [kind, setKind] = useState<"one_time" | "recurring">(cost?.kind ?? defaultKind);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveCost>>, fd: FormData) => {
    const result = await saveCost(prev, fd);
    if (result?.ok) onClose();
    return result;
  }, null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string>();
  const sub = kind === "recurring";

  return (
    <Dialog open={open} onClose={onClose} title={cost ? "Edit cost" : sub ? "Add subscription" : "Add expense"}>
      <form action={action} className="flex flex-col gap-4">
        {cost ? <input type="hidden" name="id" value={cost.id} /> : null}
        <input type="hidden" name="kind" value={kind} />
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-ctl bg-sunk p-1">
          {(
            [
              ["recurring", "Subscription"],
              ["one_time", "One-time expense"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`h-7 rounded-[5px] text-ui ${kind === k ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="What for" htmlFor="cost-name">
            <Input id="cost-name" name="name" defaultValue={cost?.name} required autoFocus placeholder={sub ? "Figma Professional" : "Domain transfer"} />
          </Field>
          <Field label="Vendor" htmlFor="cost-vendor">
            <Input id="cost-vendor" name="vendor" defaultValue={cost?.vendor ?? ""} placeholder={sub ? "Figma" : "GoDaddy"} />
          </Field>
          <Field label="Amount in ₹" htmlFor="cost-amount">
            <Input id="cost-amount" name="amount" inputMode="decimal" defaultValue={cost ? String(cost.amount) : ""} required placeholder="4,500" className="num" />
          </Field>
          {sub ? (
            <Field label="Billed" htmlFor="cost-interval">
              <Select id="cost-interval" name="interval" defaultValue={cost?.interval ?? "monthly"}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
          ) : (
            <Field label="Paid on" htmlFor="cost-paid">
              <Input id="cost-paid" name="paid_on" type="date" defaultValue={cost?.paid_on ?? ""} />
            </Field>
          )}
          {sub ? (
            <Field label="Next charge" htmlFor="cost-renewal" hint="Later renewals are worked out from this date.">
              <Input id="cost-renewal" name="next_renewal" type="date" defaultValue={cost?.next_renewal ?? ""} required />
            </Field>
          ) : null}
          <Field label="Project" htmlFor="cost-project">
            <Select id="cost-project" name="project_id" defaultValue={cost?.project_id ?? defaultProjectId ?? ""}>
              <option value="">Overhead</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          {sub && cost ? (
            <Field label="State" htmlFor="cost-active">
              <Select id="cost-active" name="active" defaultValue={cost.active ? "true" : "false"}>
                <option value="true">Active</option>
                <option value="false">Cancelled</option>
              </Select>
            </Field>
          ) : null}
        </div>
        <Field label="Notes" htmlFor="cost-notes">
          <Textarea id="cost-notes" name="notes" rows={2} defaultValue={cost?.notes ?? ""} placeholder="Seats, card used, who owns the login" />
        </Field>
        <FormError message={state?.error ?? deleteError} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {cost ? (
            confirming ? (
              <span className="flex items-center gap-2 text-ui">
                <span className="text-ink-2">Delete for good?</span>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      const r = await deleteCost(cost.id);
                      if (r?.error) setDeleteError(r.error);
                      else onClose();
                    })
                  }
                >
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
              </span>
            ) : (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : cost ? "Save changes" : "Add"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
