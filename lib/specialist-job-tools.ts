/**
 * Pure specialist job tools — diffs, public citations, drafts, shop files, speech drills.
 * No secrets, no auto-start of machines, no licensed-advice claims.
 */

export const LEGAL_SPECIALIST_IDS = [
  "ai-legal-001",
  "ai-attorney-001",
  "ai-attorney-criminal-001",
  "ai-attorney-realestate-001",
  "ai-attorney-accountant-001",
  "ai-attorney-tax-001",
  "ai-attorney-credit-001",
] as const;

export const LEGAL_CONTRACT_SPECIALIST_IDS = [
  "ai-attorney-001",
  "ai-attorney-criminal-001",
  "ai-attorney-realestate-001",
  "ai-attorney-accountant-001",
  "ai-attorney-tax-001",
  "ai-attorney-credit-001",
] as const;

export const STORY_SPECIALIST_IDS = ["ai-author-001", "ai-creative-001"] as const;
export const RHYME_SPECIALIST_IDS = ["ai-songwriter-001", "ai-poet-001"] as const;
export const FORGE_TOOL_SPECIALIST_IDS = ["ai-coder-001", "ai-game-dev-001", "ai-blockchain-001"] as const;
export const SHOP_EXPORT_SPECIALIST_IDS = ["ai-3d-specialist", "ai-cnc-master-001"] as const;
export const CNC_SEND_SPECIALIST_IDS = ["ai-cnc-master-001"] as const;

export const TRADE_LEARN_SPECIALIST_IDS = [
  "ai-electrician-001",
  "ai-contractor-001",
  "ai-hvac-001",
  "ai-landscaping-001",
  "ai-plumber-001",
  "ai-welder-001",
  "ai-roofer-001",
  "ai-drywall-001",
  "ai-framer-001",
] as const;

export const PRINT_SPECIALIST_IDS = [
  ...LEGAL_SPECIALIST_IDS,
  ...STORY_SPECIALIST_IDS,
  ...RHYME_SPECIALIST_IDS,
  "ai-musician-001",
  ...TRADE_LEARN_SPECIALIST_IDS,
  "ai-cnc-master-001",
  "ai-3d-specialist",
] as const;

export const NOT_YOUR_LAWYER_STAMP =
  "Educational information only — not legal advice, not your lawyer, and not a substitute for a licensed attorney in your state.";

export const EDUCATIONAL_DRAFT_STAMP =
  "Educational draft only — review with a qualified licensed professional before you rely on it.";

export const CNC_USER_STARTS_REMINDER =
  "File sent to your machine. You press Start. This AI will not start the cut or the print.";

export type UsState = { code: string; name: string };

export const US_STATES: readonly UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export type SpecialistToolKind =
  | "sandbox"
  | "github"
  | "legalResearch"
  | "contract"
  | "storyBible"
  | "fountain"
  | "rhyme"
  | "print"
  | "exportCheck"
  | "cncSend"
  | "spokenDrill";

const SETS = {
  legal: new Set<string>(LEGAL_SPECIALIST_IDS),
  contract: new Set<string>(LEGAL_CONTRACT_SPECIALIST_IDS),
  story: new Set<string>(STORY_SPECIALIST_IDS),
  rhyme: new Set<string>(RHYME_SPECIALIST_IDS),
  forge: new Set<string>(FORGE_TOOL_SPECIALIST_IDS),
  export: new Set<string>(SHOP_EXPORT_SPECIALIST_IDS),
  cnc: new Set<string>(CNC_SEND_SPECIALIST_IDS),
  print: new Set<string>(PRINT_SPECIALIST_IDS),
};

export function specialistToolKinds(creatorId: string): SpecialistToolKind[] {
  const kinds: SpecialistToolKind[] = [];
  if (SETS.forge.has(creatorId)) {
    kinds.push("sandbox", "github");
  }
  if (SETS.legal.has(creatorId)) kinds.push("legalResearch");
  if (SETS.contract.has(creatorId)) kinds.push("contract");
  if (SETS.story.has(creatorId)) kinds.push("storyBible", "fountain");
  if (SETS.rhyme.has(creatorId)) kinds.push("rhyme");
  if (SETS.print.has(creatorId)) kinds.push("print");
  if (SETS.export.has(creatorId)) kinds.push("exportCheck");
  if (SETS.cnc.has(creatorId)) kinds.push("cncSend");
  if (creatorId === "linguamate") kinds.push("spokenDrill");
  return kinds;
}

export function hasSpecialistJobTools(creatorId: string): boolean {
  return specialistToolKinds(creatorId).some((k) => k !== "spokenDrill");
}

export function findUsState(input: string): UsState | null {
  const raw = input.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const byCode = US_STATES.find((s) => s.code === upper);
  if (byCode) return byCode;
  const lower = raw.toLowerCase();
  return US_STATES.find((s) => s.name.toLowerCase() === lower) ?? null;
}

export type UnifiedDiffHunk = {
  path: string;
  unified: string;
  linesAdded: number;
  linesRemoved: number;
};

export function buildUnifiedDiff(path: string, before: string | undefined, after: string | undefined): UnifiedDiffHunk {
  const safePath = path.replace(/^\/+/, "").slice(0, 512) || "untitled";
  const beforeLines = (before ?? "").split(/\r?\n/);
  const afterLines = (after ?? "").split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);
  const rows: string[] = [`--- a/${safePath}`, `+++ b/${safePath}`];
  let linesAdded = 0;
  let linesRemoved = 0;

  for (let i = 0; i < max; i += 1) {
    const a = i < (before ? beforeLines.length : 0) ? beforeLines[i] : undefined;
    const b = i < (after ? afterLines.length : 0) ? afterLines[i] : undefined;
    if (a === b) {
      if (a !== undefined) rows.push(` ${a}`);
      continue;
    }
    if (a !== undefined) {
      rows.push(`-${a}`);
      linesRemoved += 1;
    }
    if (b !== undefined) {
      rows.push(`+${b}`);
      linesAdded += 1;
    }
  }

  return { path: safePath, unified: rows.join("\n"), linesAdded, linesRemoved };
}

const GITHUB_OWNER_REPO = /^[A-Za-z0-9_.-]+$/;

export type PublicGithubRepoRef = { owner: string; repo: string };

export function parsePublicGithubRepoUrl(raw: string): PublicGithubRepoRef {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Paste a public GitHub repository URL.");
  }
  if (/[\s<>]|@|:\/\//.test(trimmed) && !trimmed.startsWith("https://")) {
    throw new Error("Use an https://github.com/owner/repo URL. Tokens and SSH URLs are not allowed.");
  }
  if (/github\.com\/.+@.+:.+/.test(trimmed) || /token|ghp_|github_pat_/i.test(trimmed)) {
    throw new Error("Do not paste tokens or credentials. Public repos only.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("That is not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only https:// GitHub URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("Do not include usernames or passwords in the URL.");
  }
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("Only github.com public repositories can be imported.");
  }

  const parts = url.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
  const owner = parts[0] ?? "";
  const repo = parts[1] ?? "";
  if (!GITHUB_OWNER_REPO.test(owner) || !GITHUB_OWNER_REPO.test(repo) || parts.length < 2) {
    throw new Error("URL must look like https://github.com/owner/repo.");
  }
  if (owner === "." || owner === ".." || repo === "." || repo === "..") {
    throw new Error("Invalid repository name.");
  }

  return { owner, repo };
}

export function isBlockedGithubImportPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!normalized || normalized.includes("..") || normalized.startsWith("/")) return true;
  return /(^|\/)(\.git|\.env|\.env\..*|id_rsa|id_ed25519|credentials|secrets?|node_modules|\.npmrc|\.pypirc)(\/|$)/i.test(
    normalized,
  );
}

export function sanitizePublicSearchQuery(raw: string, maxLength = 180): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>`]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function buildCourtListenerSearchUrl(params: {
  query: string;
  stateCode?: string;
}): string {
  const q = sanitizePublicSearchQuery(params.query);
  const state = params.stateCode ? findUsState(params.stateCode) : null;
  const terms = [q, state ? `${state.name} court` : ""].filter(Boolean).join(" ");
  const url = new URL("https://www.courtlistener.com/api/rest/v4/search/");
  url.searchParams.set("q", terms);
  url.searchParams.set("type", "o");
  url.searchParams.set("order_by", "score desc");
  return url.toString();
}

export function buildGovinfoSearchUrl(params: { query: string; stateCode?: string }): string {
  const q = sanitizePublicSearchQuery(params.query);
  const state = params.stateCode ? findUsState(params.stateCode) : null;
  const terms = [q, state?.name ?? ""].filter(Boolean).join(" ");
  return `https://www.govinfo.gov/app/search/${encodeURIComponent(JSON.stringify({ query: terms }))}`;
}

export type ContractFlag = {
  phrase: string;
  note: string;
  index: number;
};

const CONTRACT_FLAGS: Array<{ pattern: RegExp; note: string }> = [
  { pattern: /\bindemnif(?:y|ication)\b/i, note: "Indemnity — who pays if something goes wrong." },
  { pattern: /\bhold harmless\b/i, note: "Hold-harmless language — often shifts risk." },
  { pattern: /\barbitration\b/i, note: "Arbitration — may limit court access." },
  { pattern: /\bwaiver of (?:jury|trial)\b/i, note: "Jury/trial waiver." },
  { pattern: /\bas[- ]is\b/i, note: "As-is — may limit warranties." },
  { pattern: /\bliquidated damages\b/i, note: "Preset damages — check if they are reasonable." },
  { pattern: /\bnon-?compete\b/i, note: "Non-compete — enforceability varies by state." },
  { pattern: /\bassignment\b/i, note: "Assignment — who can transfer the contract." },
  { pattern: /\bgoverning law\b/i, note: "Governing law — which state's rules apply." },
  { pattern: /\battorney'?s? fees\b/i, note: "Fee-shifting — who pays lawyers." },
  { pattern: /\bautomatic renewal\b/i, note: "Auto-renewal — check cancel dates." },
  { pattern: /\bwaiver of (?:rights?|claims?)\b/i, note: "Rights waiver — read carefully." },
];

export function markupContract(text: string): { flags: ContractFlag[]; stamp: string } {
  const flags: ContractFlag[] = [];
  const seen = new Set<string>();
  for (const item of CONTRACT_FLAGS) {
    const match = item.pattern.exec(text);
    if (!match) continue;
    const phrase = match[0];
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    flags.push({ phrase, note: item.note, index: match.index });
  }
  return { flags, stamp: NOT_YOUR_LAWYER_STAMP };
}

export type DocCompareLine = {
  kind: "same" | "removed" | "added" | "changed";
  left?: string;
  right?: string;
};

export function compareDocuments(left: string, right: string): {
  lines: DocCompareLine[];
  added: number;
  removed: number;
  changed: number;
  stamp: string;
} {
  const a = left.split(/\r?\n/);
  const b = right.split(/\r?\n/);
  const max = Math.max(a.length, b.length);
  const lines: DocCompareLine[] = [];
  let added = 0;
  let removed = 0;
  let changed = 0;

  for (let i = 0; i < max; i += 1) {
    const L = i < a.length ? a[i] : undefined;
    const R = i < b.length ? b[i] : undefined;
    if (L === R) {
      lines.push({ kind: "same", left: L, right: R });
    } else if (L === undefined) {
      lines.push({ kind: "added", right: R });
      added += 1;
    } else if (R === undefined) {
      lines.push({ kind: "removed", left: L });
      removed += 1;
    } else {
      lines.push({ kind: "changed", left: L, right: R });
      changed += 1;
    }
  }

  return { lines, added, removed, changed, stamp: NOT_YOUR_LAWYER_STAMP };
}

export type StoryBibleCharacter = { name: string; role: string; notes: string };
export type StoryBibleLocation = { name: string; notes: string };
export type StoryBibleChapter = { id: string; title: string; summary: string };

export type StoryBibleDraft = {
  title: string;
  logline: string;
  characters: StoryBibleCharacter[];
  locations: StoryBibleLocation[];
  chapters: StoryBibleChapter[];
};

export function expandChapterFromBible(
  bible: StoryBibleDraft,
  chapterId: string,
): { title: string; beats: string[]; reminders: string[] } {
  const chapter = bible.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    throw new Error("Chapter not found in this story bible.");
  }
  const names = bible.characters.map((c) => c.name).filter(Boolean);
  const places = bible.locations.map((l) => l.name).filter(Boolean);
  const beats = [
    `Open on: ${places[0] ?? "the established setting"} — remind the reader of ${bible.logline || bible.title || "the story promise"}.`,
    chapter.summary.trim() || `Advance the plot of “${chapter.title}”.`,
    names.length ? `On-page: ${names.slice(0, 4).join(", ")}.` : "Name who is on the page before you write dialogue.",
    `Mid-chapter turn: something in “${chapter.title}” costs the protagonist a choice.`,
    `Exit image: leave a question that the next chapter must answer.`,
  ];
  return {
    title: chapter.title,
    beats,
    reminders: [
      "This is a beat sheet, not finished prose.",
      "Keep character voices consistent with the bible notes.",
    ],
  };
}

export type FountainBlock = {
  kind: "scene" | "action" | "character" | "dialogue" | "parenthetical" | "transition";
  text: string;
};

export function formatFountain(source: string): { blocks: FountainBlock[]; plain: string } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: FountainBlock[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
      blocks.push({ kind: "scene", text: trimmed.toUpperCase() });
      continue;
    }
    if (/^(CUT TO:|FADE (?:IN|OUT):|DISSOLVE TO:|SMASH CUT TO:)/i.test(trimmed)) {
      blocks.push({ kind: "transition", text: trimmed.toUpperCase() });
      continue;
    }
    if (/^\(.*\)$/.test(trimmed)) {
      blocks.push({ kind: "parenthetical", text: trimmed });
      continue;
    }
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length <= 40 &&
      /[A-Z]/.test(trimmed) &&
      !/^(INT\.|EXT\.)/.test(trimmed)
    ) {
      blocks.push({ kind: "character", text: trimmed });
      continue;
    }
    const prev = blocks[blocks.length - 1];
    if (prev?.kind === "character" || prev?.kind === "parenthetical") {
      blocks.push({ kind: "dialogue", text: trimmed });
      continue;
    }
    blocks.push({ kind: "action", text: trimmed });
  }

  const plain = blocks
    .map((b) => {
      if (b.kind === "character") return `\n          ${b.text}`;
      if (b.kind === "dialogue") return `     ${b.text}`;
      if (b.kind === "parenthetical") return `       ${b.text}`;
      if (b.kind === "transition") return `${"".padStart(40)}${b.text}`;
      return b.text;
    })
    .join("\n");

  return { blocks, plain: plain.trim() };
}

const RHYME_BANK: Record<string, string[]> = {
  at: ["cat", "hat", "bat", "flat", "chat", "sat"],
  ay: ["day", "say", "way", "play", "stay", "away"],
  ight: ["night", "light", "bright", "sight", "right", "fight"],
  ove: ["love", "dove", "above", "glove"],
  ain: ["rain", "train", "pain", "plain", "again"],
  ing: ["sing", "ring", "bring", "spring", "wing"],
  oo: ["blue", "true", "you", "new", "through"],
  or: ["door", "more", "shore", "before"],
  ee: ["free", "see", "me", "tree", "believe"],
  ow: ["now", "how", "wow", "allow"],
};

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/e$/i, "").match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

export function suggestRhymes(word: string): { word: string; rhymes: string[]; syllables: number } {
  const clean = word.toLowerCase().replace(/[^a-z']/g, "");
  const syllables = countSyllables(clean);
  const ending = Object.keys(RHYME_BANK)
    .sort((a, b) => b.length - a.length)
    .find((end) => clean.endsWith(end));
  const rhymes = (ending ? RHYME_BANK[ending] : [])
    .filter((r) => r !== clean)
    .slice(0, 8);
  return { word: clean, rhymes, syllables };
}

export function scorePoemLine(line: string): { syllables: number; words: number } {
  const words = line.trim().split(/\s+/).filter(Boolean);
  return {
    words: words.length,
    syllables: words.reduce((sum, w) => sum + countSyllables(w), 0),
  };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildPrintableHtml(params: {
  title: string;
  body: string;
  stamp: string;
  creatorName?: string;
}): string {
  const title = escapeHtml(params.title.slice(0, 120) || "UR draft");
  const stamp = escapeHtml(params.stamp);
  const creator = escapeHtml(params.creatorName ?? "UR specialist");
  const body = escapeHtml(params.body.slice(0, 40_000)).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:Georgia,serif;margin:32px;color:#111}h1{font-size:20px}.stamp{border:2px solid #111;padding:8px;margin:16px 0;font-size:12px;font-weight:700}.meta{color:#444;font-size:12px}</style>
</head><body>
<p class="stamp">${stamp}</p>
<h1>${title}</h1>
<p class="meta">Draft from ${creator} on UR Platform. Save as PDF from your print dialog.</p>
<div>${body}</div>
</body></html>`;
}

function decodeBase64ToBytes(raw: string): Uint8Array {
  const cleaned = raw.replace(/\s+/g, "");
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(cleaned, "base64"));
  }
  const binary = globalThis.atob(cleaned);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export type ShopExportKind = "stl" | "3mf" | "gcode" | "unknown";

export type ShopExportReport = {
  kind: ShopExportKind;
  ok: boolean;
  issues: string[];
};

function looksLikeAsciiStl(text: string): boolean {
  return /^\s*solid\b/i.test(text) && /\bendsolid\b/i.test(text);
}

function looksLikeBinaryStl(bytes: Uint8Array): boolean {
  if (bytes.length < 84) return false;
  const triangles = bytes[80]! + bytes[81]! * 256 + bytes[82]! * 65536 + bytes[83]! * 16777216;
  return bytes.length === 84 + triangles * 50 && triangles > 0 && triangles < 20_000_000;
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

const GCODE_UNSAFE = /\b(eval\s*\(|child_process|\/bin\/sh|rm\s+-rf|powershell|curl\s+http|<script|<\?php)\b/i;

export function inspectShopExport(fileName: string, contentBase64: string): ShopExportReport {
  const name = fileName.trim().toLowerCase();
  const issues: string[] = [];
  let bytes: Uint8Array;
  try {
    const raw = contentBase64.includes(",") ? contentBase64.split(",").pop() ?? "" : contentBase64;
    bytes = decodeBase64ToBytes(raw);
  } catch {
    return { kind: "unknown", ok: false, issues: ["File is not valid base64."] };
  }
  if (bytes.length === 0) {
    return { kind: "unknown", ok: false, issues: ["File is empty."] };
  }
  if (bytes.length > 12_000_000) {
    issues.push("File is larger than 12MB.");
  }

  const textHead = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 4000));

  if (name.endsWith(".stl")) {
    const ascii = looksLikeAsciiStl(textHead) || looksLikeAsciiStl(new TextDecoder().decode(bytes.slice(0, 80)));
    const binary = looksLikeBinaryStl(bytes);
    if (!ascii && !binary) issues.push("STL should be ASCII (solid/endsolid) or a binary mesh of the expected size.");
    return { kind: "stl", ok: issues.length === 0, issues };
  }

  if (name.endsWith(".3mf")) {
    if (!looksLikeZip(bytes)) issues.push("3MF files are ZIP packages and must start with a PK header.");
    return { kind: "3mf", ok: issues.length === 0, issues };
  }

  if (name.endsWith(".gcode") || name.endsWith(".nc") || name.endsWith(".tap")) {
    if (GCODE_UNSAFE.test(textHead)) issues.push("G-code contains blocked script or shell tokens.");
    if (!/\bG0?[0-3]\b/i.test(textHead) && !/\bM0?[0-9]+\b/i.test(textHead)) {
      issues.push("No G or M words found — this may not be G-code.");
    }
    return { kind: "gcode", ok: issues.length === 0, issues };
  }

  return { kind: "unknown", ok: false, issues: ["Use a .stl, .3mf, or .gcode / .nc file."] };
}

export function normalizeSpokenText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const cur = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) prev[j] = j;
  for (let i = 1; i < rows; i += 1) {
    cur[0] = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    for (let j = 0; j < cols; j += 1) prev[j] = cur[j] ?? 0;
  }
  return prev[b.length] ?? Math.max(a.length, b.length);
}

export type SpokenDrillScore = {
  score: number;
  expectedWords: string[];
  heardWords: string[];
  missed: string[];
  extra: string[];
  note: string;
};

export function scoreSpokenDrill(expected: string, transcript: string): SpokenDrillScore {
  const expectedNorm = normalizeSpokenText(expected);
  const heardNorm = normalizeSpokenText(transcript);
  const expectedWords = expectedNorm.split(" ").filter(Boolean);
  const heardWords = heardNorm.split(" ").filter(Boolean);
  const expectedSet = new Set(expectedWords);
  const heardSet = new Set(heardWords);
  const missed = expectedWords.filter((w) => !heardSet.has(w));
  const extra = heardWords.filter((w) => !expectedSet.has(w));

  const wordHit = expectedWords.length
    ? expectedWords.filter((w) => heardSet.has(w)).length / expectedWords.length
    : 0;
  const maxLen = Math.max(expectedNorm.length, heardNorm.length, 1);
  const charScore = 1 - levenshtein(expectedNorm, heardNorm) / maxLen;
  const score = Math.round(Math.max(0, Math.min(1, wordHit * 0.65 + charScore * 0.35)) * 100);

  return {
    score,
    expectedWords,
    heardWords,
    missed,
    extra,
    note: "Practice score from the words you typed or dictated — not a medical speech diagnosis.",
  };
}

export function assertShopSendNeverAutoStarts(startPrint: boolean | undefined): void {
  if (startPrint) {
    throw new Error("Shop send is file-only. A person must press Start on the machine.");
  }
}
