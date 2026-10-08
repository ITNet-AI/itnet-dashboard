"use server";

import { run, text, toState, type ActionState } from "@/lib/action-utils";
import * as team from "@/lib/tools/team";

export async function inviteMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await run(team.inviteMember, { full_name: text(fd, "full_name"), email: text(fd, "email") });
  return toState(result, result.ok ? `Invite sent to ${result.data.email}.` : undefined);
}

export async function resendInvite(email: string): Promise<ActionState> {
  const result = await run(team.resendInvite, { email });
  return toState(result, result.ok ? `Invite sent again to ${result.data.email}.` : undefined);
}

export async function setAdmin(id: string, isAdmin: boolean): Promise<ActionState> {
  return toState(await run(team.setAdmin, { id, is_admin: isAdmin }));
}
