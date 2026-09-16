export const OWNER_OPS_TAB_IDS = [
  "ais",
  "people",
  "command",
  "conduct",
  "commerce",
  "security",
  "more",
] as const;

export type OwnerOpsTabId = (typeof OWNER_OPS_TAB_IDS)[number];

export const OWNER_OPS_TABS: { id: OwnerOpsTabId; label: string; emoji: string }[] = [
  { id: "ais", label: "AIs", emoji: "🤖" },
  { id: "people", label: "People", emoji: "👥" },
  { id: "command", label: "Command", emoji: "🧭" },
  { id: "conduct", label: "Conduct", emoji: "⚖️" },
  { id: "commerce", label: "Money", emoji: "💳" },
  { id: "security", label: "Security", emoji: "🔒" },
  { id: "more", label: "More", emoji: "📌" },
];

export function isOwnerOpsTabId(value: string): value is OwnerOpsTabId {
  return (OWNER_OPS_TAB_IDS as readonly string[]).includes(value);
}
