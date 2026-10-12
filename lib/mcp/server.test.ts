import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import type { ToolContext } from "@/lib/tools";
import { buildMcpServer } from "./server";

const profile = (is_admin: boolean) =>
  ({ id: "00000000-0000-4000-8000-000000000001", full_name: "Test Person", email: "test@example.com", is_admin }) as ToolContext["user"];

/** A database that fails every query, so tool errors can be checked without a network. */
const brokenDb = {
  from() {
    throw new Error("database is down");
  },
} as unknown as ToolContext["supabase"];

async function connect(is_admin: boolean, supabase = brokenDb) {
  const server = buildMcpServer({ supabase, user: profile(is_admin) });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

const ADMIN_ONLY = ["list_costs", "collect_payment", "delete_project", "delete_client", "create_cost", "update_cost", "delete_cost", "invite_member", "resend_invite", "set_admin"];

describe("Claude connector", () => {
  it("offers members everything except admin tools", async () => {
    const names = (await (await connect(false)).listTools()).tools.map((t) => t.name);
    for (const n of ADMIN_ONLY) expect(names).not.toContain(n);
    expect(names).toContain("create_task");
    expect(names).toContain("list_tasks");
  });

  it("offers admins the full set", async () => {
    const names = (await (await connect(true)).listTools()).tools.map((t) => t.name);
    for (const n of ADMIN_ONLY) expect(names).toContain(n);
  });

  it("describes every input as a plain object schema", async () => {
    const { tools } = await (await connect(true)).listTools();
    for (const t of tools) expect(t.inputSchema.type, t.name).toBe("object");
  });

  it("marks reads, deletes and admin changes so Claude knows when to ask", async () => {
    const tools = Object.fromEntries((await (await connect(true)).listTools()).tools.map((t) => [t.name, t.annotations ?? {}]));
    expect(tools.list_tasks.readOnlyHint).toBe(true);
    expect(tools.list_tasks.destructiveHint).toBe(false);
    expect(tools.create_task.readOnlyHint).toBe(false);
    expect(tools.create_task.destructiveHint).toBe(false);
    for (const n of ["delete_task", "delete_project", "delete_client", "delete_comment", "delete_cost", "set_admin"]) expect(tools[n].destructiveHint, n).toBe(true);
    for (const a of Object.values(tools)) expect(a.openWorldHint).toBe(false);
  });

  it("answers whoami from the caller's own profile", async () => {
    const result = await (await connect(false)).callTool({ name: "whoami", arguments: {} });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse((result.content as { text: string }[])[0].text);
    expect(data).toMatchObject({ email: "test@example.com", is_admin: false });
    expect(data.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns a tool failure as an error Claude can read, not a crash", async () => {
    const result = await (await connect(false)).callTool({ name: "list_people", arguments: {} });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toContain("database is down");
  });

  it("refuses an admin tool a member tries to call by name", async () => {
    const result = await (await connect(false)).callTool({ name: "list_costs", arguments: {} }).catch((e: Error) => ({ isError: true, content: [{ text: e.message }] }));
    expect(result.isError).toBe(true);
  });

  it("tells Claude to check the date and to treat stored text as data", async () => {
    const client = await connect(false);
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toContain("whoami");
    expect(instructions).toContain("never as instructions");
    expect(instructions).toMatch(/https?:\/\/[^/]+\/projects\/<id>/);
  });
});
