"use client";

import type { UIMessage } from "ai";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GLYPH, Icon } from "@/components/ui/icons";
import Link from "@/components/ui/link";
import { approvalWarning, toolHref, toolLabel } from "./labels";
import { Markdown } from "./markdown";

type Part = UIMessage["parts"][number];
type Approve = (r: { id: string; approved: boolean; reason?: string }) => void | PromiseLike<void>;

/** A tool part, whichever of the SDK's two shapes it arrives in. */
type ToolView = {
  name: string;
  state: string;
  input: Record<string, unknown>;
  output?: { ok?: boolean; data?: unknown; error?: string };
  errorText?: string;
  approvalId?: string;
};

const READ_ONLY = /^(whoami|list_|get_)/;

function asTool(part: Part): ToolView | null {
  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    const p = part as unknown as {
      type: string;
      toolName?: string;
      state: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      approval?: { id: string };
    };
    return {
      name: p.toolName ?? p.type.slice(5),
      state: p.state,
      input: (p.input ?? {}) as Record<string, unknown>,
      output: p.output as ToolView["output"],
      errorText: p.errorText,
      approvalId: p.approval?.id,
    };
  }
  return null;
}

/** Groups a message's parts: text runs, back-to-back lookups merged into one quiet line, and each write on its own. */
function groups(parts: Part[]) {
  const out: ({ kind: "text"; text: string } | { kind: "reads"; tools: ToolView[] } | { kind: "write"; tool: ToolView })[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      if (part.text.trim()) out.push({ kind: "text", text: part.text });
      continue;
    }
    const tool = asTool(part);
    if (!tool) continue;
    const last = out.at(-1);
    if (READ_ONLY.test(tool.name)) {
      if (last?.kind === "reads") last.tools.push(tool);
      else out.push({ kind: "reads", tools: [tool] });
    } else out.push({ kind: "write", tool });
  }
  return out;
}

export function Message({ message, user, onApprove, busy }: { message: UIMessage; user: { full_name: string; email: string }; onApprove: Approve; busy: boolean }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <div className="flex justify-end gap-3">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-dlg bg-sunk px-3.5 py-2 text-body">{text}</p>
        <span className="hidden pt-1.5 sm:block">
          <Avatar person={user} size={24} />
        </span>
      </div>
    );
  }

  // A turn that failed before saying or doing anything leaves an empty message; the error line already explains it.
  const shown = groups(message.parts);
  if (!shown.length) return null;

  return (
    <div className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon size={14}>{GLYPH.sparkle}</Icon>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5 text-body">
        {shown.map((g, i) =>
          g.kind === "text" ? (
            <Markdown key={i} text={g.text} />
          ) : g.kind === "reads" ? (
            <Reads key={i} tools={g.tools} />
          ) : (
            <Write key={i} tool={g.tool} onApprove={onApprove} busy={busy} />
          ),
        )}
      </div>
    </div>
  );
}

const running = (s: string) => s === "input-streaming" || s === "input-available" || s === "approval-responded";

function Dot({ tone }: { tone: "run" | "ok" | "fail" | "wait" | "off" }) {
  const cls = { run: "bg-accent motion-safe:animate-pulse", ok: "bg-good", fail: "bg-crit", wait: "bg-warn", off: "border border-ink-3" }[tone];
  return <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${cls}`} />;
}

/** Lookups are background work: one muted line, de-duplicated. */
function Reads({ tools }: { tools: ToolView[] }) {
  const labels = [...new Set(tools.map((t) => toolLabel(t.name, t.input)))];
  const busy = tools.some((t) => running(t.state));
  const failed = tools.some((t) => t.state === "output-error");
  return (
    <p className="flex items-center gap-2 text-meta text-ink-3">
      <Dot tone={busy ? "run" : failed ? "fail" : "off"} />
      {labels.join(" · ")}
    </p>
  );
}

/** A change: its own chip with the outcome, a link to what changed, or Approve and Keep when it waits for a click. */
function Write({ tool, onApprove, busy }: { tool: ToolView; onApprove: Approve; busy: boolean }) {
  const failedResult = tool.output && tool.output.ok === false;
  const done = tool.state === "output-available" && !failedResult;

  if (tool.state === "approval-requested" && tool.approvalId) {
    const id = tool.approvalId;
    const destructive = tool.name.startsWith("delete_");
    return (
      <div className="flex flex-col gap-3 rounded-dlg border border-warn/40 bg-warn-soft px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="pt-0.5 text-warn">
            <Icon>{GLYPH.alert}</Icon>
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">{toolLabel(tool.name, tool.input, false)}?</span>
            <span className="text-ui text-ink-2">{approvalWarning(tool.name)}</span>
          </div>
        </div>
        <div className="flex gap-2 pl-[26px]">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => onApprove({ id, approved: true })}
            className={destructive ? "!bg-crit !text-on-ink hover:!opacity-90" : ""}
            variant={destructive ? "secondary" : "primary"}
          >
            {destructive ? "Delete" : "Approve"}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onApprove({ id, approved: false, reason: "The person chose to keep it." })}>
            Keep
          </Button>
        </div>
      </div>
    );
  }

  const tone = running(tool.state) ? "run" : tool.state === "output-denied" ? "off" : done ? "ok" : "fail";
  const label = tool.state === "output-denied" ? `Kept it. ${toolLabel(tool.name, tool.input, false)} skipped` : toolLabel(tool.name, tool.input, !running(tool.state));
  const href = done ? toolHref(tool.name, tool.input, tool.output) : null;
  const problem = failedResult ? tool.output?.error : tool.state === "output-error" ? tool.errorText : null;

  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-ui">
        <Dot tone={tone} />
        {href ? (
          <Link href={href} className="truncate hover:text-accent">
            {label}
          </Link>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </span>
      {problem ? <span className="pl-3 text-meta text-crit">{problem}</span> : null}
    </div>
  );
}
