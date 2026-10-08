import "server-only";
import { addComment, deleteComment } from "./comments";
import { createClient, deleteClient, updateClient } from "./clients";
import { createCost, deleteCost, updateCost } from "./costs";
import type { Tool } from "./define";
import { createProject, deleteProject, updateProject } from "./projects";
import { getProject, getTask, listActivity, listClients, listCosts, listMentions, listPeople, listProjects, listTasks, whoami } from "./reads";
import { createTask, deleteTask, moveTask, setTaskDone, updateTask } from "./tasks";
import { inviteMember, resendInvite, setAdmin } from "./team";

export { contextFromAccessToken } from "./context";
export { callTool, type Tool, type ToolContext, type ToolResult } from "./define";

/** Everything the dashboard can read or change. The MCP layer exposes this list as-is. */
export const tools: Tool[] = [
  whoami,
  listPeople,
  listProjects,
  getProject,
  listTasks,
  getTask,
  listMentions,
  listClients,
  listActivity,
  listCosts,
  createTask,
  updateTask,
  moveTask,
  setTaskDone,
  deleteTask,
  createProject,
  updateProject,
  deleteProject,
  createClient,
  updateClient,
  deleteClient,
  addComment,
  deleteComment,
  createCost,
  updateCost,
  deleteCost,
  inviteMember,
  resendInvite,
  setAdmin,
] as Tool[];

export function findTool(name: string) {
  return tools.find((t) => t.name === name);
}
