"use server";

import { opt, run, text, toState, type ActionState } from "@/lib/action-utils";
import * as costs from "@/lib/tools/costs";

export async function saveCost(_: ActionState, fd: FormData): Promise<ActionState> {
  const amount = text(fd, "amount")?.replace(/[₹,\s]/g, "");
  const input = {
    name: text(fd, "name"),
    vendor: text(fd, "vendor"),
    amount: amount === undefined ? undefined : Number(amount),
    kind: opt(fd, "kind") ?? "one_time",
    interval: text(fd, "interval"),
    next_renewal: text(fd, "next_renewal"),
    paid_on: text(fd, "paid_on"),
    project_id: text(fd, "project_id"),
    notes: text(fd, "notes"),
    active: text(fd, "active") !== "false",
  };
  const id = text(fd, "id");
  return toState(id ? await run(costs.updateCost, { id, ...input }) : await run(costs.createCost, input));
}

export async function deleteCost(id: string): Promise<ActionState> {
  return toState(await run(costs.deleteCost, { id }));
}
