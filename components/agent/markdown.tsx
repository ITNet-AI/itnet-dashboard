import { Fragment, type ReactNode } from "react";
import Link from "@/components/ui/link";

/**
 * The small slice of markdown the agent is told to use: paragraphs, "- " lists, **bold**, `code` and [links](/path).
 * Anything else shows as plain text. Links inside the app use the app's Link; others open in a new tab.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    para = [];
  };
  const flushList = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length} className="flex list-disc flex-col gap-1 pl-5 marker:text-ink-3">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
    list = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (bullet) {
      flushPara();
      list.push(bullet[2]);
    } else if (!line) {
      flushPara();
      flushList();
    } else {
      flushList();
      // A heading the model slips in anyway reads as a bold line.
      para.push(line.replace(/^#{1,6}\s+(.*)$/, "**$1**"));
    }
  }
  flushPara();
  flushList();
  return <div className="flex flex-col gap-2.5">{blocks}</div>;
}

const TOKEN = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;

function inline(text: string): ReactNode {
  return text.split(TOKEN).map((piece, i) => {
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(piece);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith("/") && !href.startsWith("//"))
        return (
          <Link key={i} href={href} className="font-semibold text-accent hover:underline">
            {label}
          </Link>
        );
      if (/^https?:\/\//.test(href))
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            {label}
          </a>
        );
      return <Fragment key={i}>{label}</Fragment>;
    }
    if (/^\*\*[^*]+\*\*$/.test(piece)) return <strong key={i} className="font-semibold">{piece.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(piece))
      return (
        <code key={i} className="rounded-sm bg-sunk px-1 text-[0.92em]">
          {piece.slice(1, -1)}
        </code>
      );
    return <Fragment key={i}>{piece}</Fragment>;
  });
}
