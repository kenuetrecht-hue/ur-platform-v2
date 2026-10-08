import { marked } from "marked";

/** Inline runs. Raw HTML is reduced to text so a reply cannot run a script. */
export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: MdInline[] }
  | { kind: "em"; children: MdInline[] }
  | { kind: "del"; children: MdInline[] }
  | { kind: "code"; text: string }
  | { kind: "link"; children: MdInline[]; href: string | null }
  | { kind: "break" };

export type MdBlock =
  | { kind: "paragraph"; children: MdInline[] }
  | { kind: "heading"; depth: number; children: MdInline[] }
  | { kind: "code"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: MdBlock[][] }
  | { kind: "quote"; children: MdBlock[] }
  | { kind: "rule" }
  | { kind: "table"; header: MdInline[][]; rows: MdInline[][][] };

type Loose = {
  type: string;
  text?: string;
  raw?: string;
  tokens?: Loose[];
  items?: Loose[];
  href?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | "";
  task?: boolean;
  checked?: boolean;
  header?: { text: string; tokens?: Loose[] }[];
  rows?: { text: string; tokens?: Loose[] }[][];
};

/** Only http(s) links are tappable. javascript: and other schemes stay as text. */
export function safeMarkdownHref(href: string | undefined | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/")) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function stripTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, "");
}

/**
 * Header marks the voice reads as "hashtag".
 * A mark after a letter or digit stays, so C# is still C#.
 */
export function stripHeadingMarks(text: string): string {
  return text.replace(/\uFF03/g, "#").replace(/(^|[^A-Za-z0-9])#+/g, "$1");
}

function inlines(tokens: Loose[] | undefined, fallback?: string): MdInline[] {
  if (!tokens?.length) {
    return fallback ? [{ kind: "text", text: fallback }] : [];
  }
  return tokens.flatMap(inlineFrom);
}

function inlineFrom(token: Loose): MdInline[] {
  switch (token.type) {
    case "escape":
    case "text":
      return token.tokens?.length
        ? inlines(token.tokens, token.text)
        : [{ kind: "text", text: stripHeadingMarks(token.text ?? "") }];
    case "strong":
      return [{ kind: "strong", children: inlines(token.tokens, token.text) }];
    case "em":
      return [{ kind: "em", children: inlines(token.tokens, token.text) }];
    case "del":
      return [{ kind: "del", children: inlines(token.tokens, token.text) }];
    case "codespan":
      return [{ kind: "code", text: token.text ?? "" }];
    case "br":
      return [{ kind: "break" }];
    case "link":
      return [
        {
          kind: "link",
          href: safeMarkdownHref(token.href),
          children: inlines(token.tokens, token.text),
        },
      ];
    case "image":
      return [{ kind: "text", text: token.text ?? "" }];
    case "html":
      return [{ kind: "text", text: stripTags(token.text ?? token.raw ?? "") }];
    default:
      return token.text ? [{ kind: "text", text: token.text }] : [];
  }
}

function blocksFrom(tokens: Loose[] | undefined): MdBlock[] {
  if (!tokens?.length) return [];
  return tokens.flatMap((token) => {
    const block = blockFrom(token);
    return block ? [block] : [];
  });
}

function blockFrom(token: Loose): MdBlock | null {
  switch (token.type) {
    case "space":
      return null;
    case "paragraph":
    case "text":
      return { kind: "paragraph", children: inlines(token.tokens, token.text) };
    case "heading":
      return {
        kind: "heading",
        depth: token.depth ?? 1,
        children: inlines(token.tokens, token.text),
      };
    case "code":
      return { kind: "code", text: token.text ?? "" };
    case "blockquote":
      return { kind: "quote", children: blocksFrom(token.tokens) };
    case "list":
      return {
        kind: "list",
        ordered: Boolean(token.ordered),
        start: typeof token.start === "number" ? token.start : 1,
        items: (token.items ?? []).map((item) => {
          const itemBlocks = blocksFrom(item.tokens);
          if (!item.task) return itemBlocks;
          const mark: MdBlock = {
            kind: "paragraph",
            children: [{ kind: "text", text: item.checked ? "☑ " : "☐ " }],
          };
          return [mark, ...itemBlocks];
        }),
      };
    case "hr":
      return { kind: "rule" };
    case "table":
      return {
        kind: "table",
        header: (token.header ?? []).map((cell) => inlines(cell.tokens, cell.text)),
        rows: (token.rows ?? []).map((row) => row.map((cell) => inlines(cell.tokens, cell.text))),
      };
    case "html": {
      const text = stripTags(token.text ?? token.raw ?? "");
      return text ? { kind: "paragraph", children: [{ kind: "text", text }] } : null;
    }
    default:
      return token.text ? { kind: "paragraph", children: [{ kind: "text", text: token.text }] } : null;
  }
}

/** Turn a reply into blocks the website and the phone can draw. HTML is not kept. */
export function parseSafeMarkdown(source: string): MdBlock[] {
  const tokens = marked.lexer(source ?? "", { gfm: true, breaks: true }) as unknown as Loose[];
  return blocksFrom(tokens);
}

function speechFromInlines(nodes: MdInline[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
        case "code":
          return node.text;
        case "strong":
        case "em":
        case "del":
        case "link":
          return speechFromInlines(node.children);
        case "break":
          return " ";
        default:
          return "";
      }
    })
    .join("");
}

function finishSpokenLine(line: string): string {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function speechFromBlocks(blocks: MdBlock[]): string[] {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "paragraph":
      case "heading": {
        const line = finishSpokenLine(speechFromInlines(block.children));
        if (line) parts.push(line);
        break;
      }
      case "code": {
        const line = finishSpokenLine(block.text);
        if (line) parts.push(line);
        break;
      }
      case "quote":
        parts.push(...speechFromBlocks(block.children));
        break;
      case "list":
        block.items.forEach((item, index) => {
          const line = speechFromBlocks(item).join(" ").replace(/\s+/g, " ").trim();
          if (!line) return;
          parts.push(block.ordered ? `${block.start + index}. ${line}` : line);
        });
        break;
      case "rule":
        break;
      case "table":
        for (const cell of [...block.header, ...block.rows.flat()]) {
          const line = finishSpokenLine(speechFromInlines(cell));
          if (line) parts.push(line);
        }
        break;
      default:
        break;
    }
  }
  return parts;
}

/** Heading marks and emphasis that can still sit in a one-line voice script. */
function stripResidualSpeechMarkdown(text: string): string {
  return stripHeadingMarks(text)
    .replace(/\*\*|__|~~/g, "")
    .replace(/`+/g, "")
    .replace(/([.!?])\s+-\s+/g, "$1 ")
    .replace(/\s+-\s+/g, ". ")
    .replace(/\.{2,}/g, ".");
}

/**
 * Words for the voice. Headings are spoken as their title, so the voice
 * does not read each # as "hashtag". The on-screen reply still uses the blocks.
 */
export function markdownToSpeech(source: string): string {
  const raw = stripHeadingMarks(source ?? "");
  const spoken = stripResidualSpeechMarkdown(speechFromBlocks(parseSafeMarkdown(raw)).join(" "))
    .replace(/\s+/g, " ")
    .trim();
  if (spoken) return spoken;
  return stripResidualSpeechMarkdown(raw).replace(/\s+/g, " ").trim();
}
