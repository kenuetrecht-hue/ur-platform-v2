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
        : [{ kind: "text", text: token.text ?? "" }];
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
