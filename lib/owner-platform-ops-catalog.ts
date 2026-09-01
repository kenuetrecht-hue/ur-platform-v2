import type { AiCreatorCatalogEntry } from "./ai-creator-catalog";

/** Owner-only ops AIs — not shown to regular users. */
export const BUSINESS_STEWARD_AI_ID = "platform-business-steward-ai";

export const OWNER_PLATFORM_OPS_CATALOG: AiCreatorCatalogEntry[] = [
  {
    id: BUSINESS_STEWARD_AI_ID,
    name: "Business Steward AI",
    avatar: "📋",
    category: "Owner Operations",
    mission:
      "Your private operator for the website and app — sales, ads, marketing, launch checklists, and tax-date reminders. Members cannot see this AI.",
  },
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
];

export const OWNER_OPS_AI_IDS = OWNER_PLATFORM_OPS_CATALOG.map((c) => c.id);

export function isOwnerOpsAiId(id: string): boolean {
  return OWNER_OPS_AI_IDS.includes(id);
}
