/** Plain words for each tool call, shown as a chip in the chat. Reads say what was checked; writes say what changed. */

type Input = Record<string, unknown>;
type Output = { ok?: boolean; data?: unknown; error?: string } | undefined;

const q = (v: unknown) => (typeof v === "string" && v ? `“${v.length > 48 ? `${v.slice(0, 45)}…` : v}”` : "");

const READS: Record<string, string> = {
  whoami: "Checked who you are",
  list_people: "Looked up the team",
  list_projects: "Looked up projects",
  get_project: "Opened a project",
  list_tasks: "Looked up tasks",
  get_task: "Opened a task",
  list_mentions: "Checked mentions",
  list_clients: "Looked up clients",
  list_activity: "Read recent activity",
  list_costs: "Looked up costs",
};

const STATUS: Record<string, string> = { todo: "To do", doing: "In progress", done: "Done", active: "Active", paused: "Paused", billing: "Billing", paid: "Paid" };

/** What the call does, in the past tense once it has run. */
export function toolLabel(name: string, input: Input = {}, done = true): string {
  if (READS[name]) return READS[name];
  const t = q(input.title) || q(input.name);
  const verbs: Record<string, [string, string]> = {
    create_task: ["Adding task", "Added task"],
    update_task: ["Updating task", "Updated task"],
    move_task: ["Moving task", "Moved task"],
    set_task_done: [input.done === false ? "Reopening task" : "Completing task", input.done === false ? "Reopened task" : "Completed task"],
    delete_task: ["Delete task", "Deleted task"],
    create_project: ["Starting project", "Started project"],
    update_project: ["Updating project", "Updated project"],
    collect_payment: ["Recording payment", "Recorded payment"],
    delete_project: ["Delete project", "Deleted project"],
    create_client: ["Adding client", "Added client"],
    update_client: ["Updating client", "Updated client"],
    delete_client: ["Delete client", "Deleted client"],
    add_comment: ["Commenting", "Commented"],
    delete_comment: ["Delete comment", "Deleted comment"],
    create_cost: ["Adding cost", "Added cost"],
    update_cost: ["Updating cost", "Updated cost"],
    delete_cost: ["Delete cost", "Deleted cost"],
    invite_member: ["Inviting", "Invited"],
    resend_invite: ["Resending invite", "Resent invite"],
    set_admin: [input.is_admin === false ? "Remove admin access" : "Give admin access", input.is_admin === false ? "Removed admin access" : "Gave admin access"],
  };
  const pair = verbs[name] ?? ["Running " + name.replace(/_/g, " "), "Ran " + name.replace(/_/g, " ")];
  const status = typeof input.status === "string" && (name === "move_task" || name === "update_project") ? ` to ${STATUS[input.status] ?? input.status}` : "";
  const who = name === "invite_member" && typeof input.email === "string" ? ` ${input.email}` : "";
  return `${done ? pair[1] : pair[0]}${t ? ` ${t}` : ""}${who}${status}`;
}

/** A link to what a write touched, when the input or result names it. */
export function toolHref(name: string, input: Input = {}, output: Output): string | null {
  const data = (output?.ok ? output.data : null) as { id?: string } | null;
  const id = typeof input.id === "string" ? input.id : data?.id;
  if (name === "create_task" && typeof input.project_id === "string" && data?.id) return `/projects/${input.project_id}?task=${data.id}`;
  if (/^(create|update)_project$|^collect_payment$/.test(name) && id) return `/projects/${id}`;
  if (/^(create|update)_client$/.test(name) && id) return `/clients/${id}`;
  if (/_cost$/.test(name) && !name.startsWith("delete")) return "/money";
  return null;
}

/** Destructive calls get a sentence that says what will happen. */
export function approvalWarning(name: string): string {
  if (name === "set_admin") return "This changes what they can see and do.";
  if (name === "delete_project") return "Its tasks, comments and activity go with it. This can't be undone.";
  return "This can't be undone.";
}
