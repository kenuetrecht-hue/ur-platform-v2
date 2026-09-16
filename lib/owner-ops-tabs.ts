export const OWNER_OPS_TAB_IDS = [
  "chat",
  "prices",
  "posts",
  "staff",
  "sections",
  "program",
  "people",
  "command",
  "conduct",
  "money",
  "security",
  "more",
] as const;

export type OwnerOpsTabId = (typeof OWNER_OPS_TAB_IDS)[number];

export const OWNER_OPS_TABS: { id: OwnerOpsTabId; label: string; emoji: string }[] = [
  { id: "chat", label: "Chat", emoji: "💬" },
  { id: "prices", label: "Prices", emoji: "💲" },
  { id: "posts", label: "Posts", emoji: "📣" },
  { id: "staff", label: "Staff", emoji: "🪪" },
  { id: "sections", label: "Sections", emoji: "🧰" },
  { id: "program", label: "Program", emoji: "⏳" },
  { id: "people", label: "People", emoji: "👥" },
  { id: "command", label: "Command", emoji: "🧭" },
  { id: "conduct", label: "Conduct", emoji: "⚖️" },
  { id: "money", label: "Money", emoji: "💳" },
  { id: "security", label: "Security", emoji: "🔒" },
  { id: "more", label: "More", emoji: "📌" },
];

export const OWNER_OPS_TAB_ROWS = [
  OWNER_OPS_TABS.slice(0, 6),
  OWNER_OPS_TABS.slice(6),
] as const;

export type PlatformOpsDesk =
  | "chat"
  | "prices"
  | "posts"
  | "staff"
  | "sections"
  | "program"
  | "ledger"
  | "all";

const OWNER_OPS_CONSOLE_DESK: Partial<Record<OwnerOpsTabId, PlatformOpsDesk>> = {
  chat: "chat",
  prices: "prices",
  posts: "posts",
  staff: "staff",
  sections: "sections",
  program: "program",
  money: "ledger",
};

export function ownerOpsConsoleDesk(tab: OwnerOpsTabId): PlatformOpsDesk | null {
  return OWNER_OPS_CONSOLE_DESK[tab] ?? null;
}

export function showOwnerOpsDesk(
  desk: PlatformOpsDesk,
  name: Exclude<PlatformOpsDesk, "all">,
): boolean {
  return desk === "all" || desk === name;
}

export function isOwnerOpsTabId(value: string): value is OwnerOpsTabId {
  return (OWNER_OPS_TAB_IDS as readonly string[]).includes(value);
}
