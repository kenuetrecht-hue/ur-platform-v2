/**
 * Owner-only Command Center — audit of what UR AIs do together and how they protect the platform.
 * Client-safe types. Never expose this feed to members or staff.
 */

export const OWNER_COMMAND_EVENT_KINDS = [
  "ops_chat",
  "hive_consult",
  "town_hall",
  "specialist_chat",
  "incident",
  "remediation",
  "health_scan",
  "section",
  "protection",
  "sandbox_repair",
] as const;

export type OwnerCommandEventKind = (typeof OWNER_COMMAND_EVENT_KINDS)[number];

export type OwnerCommandSeverity = "info" | "watch" | "high" | "critical";

export type OwnerCommandEvent = {
  id: string;
  createdAt: string;
  kind: OwnerCommandEventKind;
  severity: OwnerCommandSeverity;
  sourceAiId: string;
  sourceAiName: string;
  /** Plain English for the owner — never leave this in another language. */
  english: string;
  /** Terminal one-liner (English). */
  terminalLine: string;
  relatedAiIds: string[];
  relatedAiNames: string[];
  incidentId?: string;
  sectionId?: string;
  userIdSuffix?: string;
  translated: boolean;
  /** Short original excerpt for the audit file (may be another language). */
  originalExcerpt?: string;
};

export type OwnerCommandRoadmapNode = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: "online" | "watch" | "busy";
};

export type OwnerCommandProtectionStat = {
  id: string;
  label: string;
  value: string;
  tone: "ok" | "watch" | "alert";
};

export type OwnerCommandPendingRepair = {
  incidentId: string;
  title: string;
  diagnosis: string;
  planSteps: string[];
  liveActions: string[];
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  status: "passed" | "failed" | "needs_owner" | "running";
  wouldTouchLive: string[];
  sandboxPassed: boolean;
};
