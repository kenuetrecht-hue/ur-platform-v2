import type { AiCreatorCatalogEntry } from "./ai-creator-catalog";

/** Owner-only ops AIs — not shown to regular users. */
export const OWNER_PLATFORM_OPS_CATALOG: AiCreatorCatalogEntry[] = [
  {
    id: "platform-doctor-ai",
    name: "Doctor AI",
    avatar: "🩺",
    category: "Owner Operations",
    mission: "Platform health — uptime, bugs, errors, and performance monitoring.",
  },
  {
    id: "platform-administration-ai",
    name: "Administration AI",
    avatar: "🏛️",
    category: "Owner Operations",
    mission: "Compliance, policies, accounts, and platform governance.",
  },
  {
    id: "platform-security-ai",
    name: "Security AI",
    avatar: "🛡️",
    category: "Owner Operations",
    mission: "Malware protection, security monitoring, and incident response.",
  },
  {
    id: "platform-business-steward-ai",
    name: "Business Steward AI",
    avatar: "📋",
    category: "Owner Operations",
    mission:
      "Your private operator: marketing, Learn academy, cash/go-live checklists, and Indiana/federal tax-date reminders — members cannot see this AI.",
  },
];

export const OWNER_OPS_AI_IDS = OWNER_PLATFORM_OPS_CATALOG.map((c) => c.id);

export function isOwnerOpsAiId(id: string): boolean {
  return OWNER_OPS_AI_IDS.includes(id);
}
