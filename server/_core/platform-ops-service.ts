import { randomUUID } from "crypto";
import { ENV } from "./env";
import { isGoogleCloudAiConfigured } from "./google-ai";
import { notifyOwner } from "./notification";
import {
  isOwnerOnlyPlatformAi,
  type OwnerPlatformAiId,
} from "./platform-ops-ai";
import {
  getNamespaceCircuitStatus,
  type ApiNamespace,
} from "./api-security";

export type OpsIncidentSeverity = "low" | "medium" | "high" | "critical";
export type OpsIncidentCategory =
  | "security"
  | "bug"
  | "compliance"
  | "performance"
  | "malware"
  | "config"
  | "monitoring";

export type OpsIncidentStatus =
  | "detected"
  | "awaiting_owner_approval"
  | "approved"
  | "rejected"
  | "resolved";

export type OpsIncident = {
  id: string;
  sourceAi: OwnerPlatformAiId;
  severity: OpsIncidentSeverity;
  category: OpsIncidentCategory;
  title: string;
  problem: string;
  proposedFix: string;
  actionsTaken: string[];
  status: OpsIncidentStatus;
  createdAt: string;
  updatedAt: string;
  ownerApprovedAt?: string;
  ownerNote?: string;
};

const incidents = new Map<string, OpsIncident>();
const ownerNotifications: Array<{
  id: string;
  incidentId: string;
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
}> = [];

export function listOpsIncidents(): OpsIncident[] {
  return [...incidents.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getOpsIncident(id: string): OpsIncident | undefined {
  return incidents.get(id);
}

export function listOwnerNotifications() {
  return [...ownerNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function dispatchOwnerAlert(title: string, content: string, incidentId: string) {
  const notification = {
    id: randomUUID(),
    incidentId,
    title,
    content,
    createdAt: new Date().toISOString(),
    read: false,
  };
  ownerNotifications.unshift(notification);

  console.log("\n[PlatformOps] 🔔 OWNER ALERT");
  console.log(`[PlatformOps] ${title}`);
  console.log(content);
  console.log("[PlatformOps] Incident ID:", incidentId, "\n");

  try {
    await notifyOwner({ title, content });
  } catch {
    /* in-app queue is the fallback */
  }
}

export async function createOpsIncident(input: {
  sourceAi: OwnerPlatformAiId;
  severity: OpsIncidentSeverity;
  category: OpsIncidentCategory;
  title: string;
  problem: string;
  proposedFix: string;
  actionsTaken?: string[];
}): Promise<OpsIncident> {
  const now = new Date().toISOString();
  const incident: OpsIncident = {
    id: randomUUID(),
    sourceAi: input.sourceAi,
    severity: input.severity,
    category: input.category,
    title: input.title,
    problem: input.problem,
    proposedFix: input.proposedFix,
    actionsTaken: input.actionsTaken ?? [],
    status: "awaiting_owner_approval",
    createdAt: now,
    updatedAt: now,
  };
  incidents.set(incident.id, incident);

  const content = [
    `Severity: ${incident.severity.toUpperCase()}`,
    `Category: ${incident.category}`,
    `Source: ${incident.sourceAi}`,
    "",
    "PROBLEM:",
    incident.problem,
    "",
    "PROPOSED FIX:",
    incident.proposedFix,
    "",
    incident.actionsTaken.length
      ? `ACTIONS TAKEN:\n${incident.actionsTaken.map((a) => `• ${a}`).join("\n")}`
      : "ACTIONS TAKEN: (pending owner approval before changes)",
    "",
    "⏳ Awaiting your final approval in Owner Ops Console.",
  ].join("\n");

  await dispatchOwnerAlert(`[UR Ops] ${incident.title}`, content, incident.id);
  return incident;
}

export async function approveOpsIncident(
  incidentId: string,
  ownerNote?: string,
): Promise<OpsIncident> {
  const incident = incidents.get(incidentId);
  if (!incident) {
    throw new Error("Incident not found");
  }
  const now = new Date().toISOString();
  incident.status = "approved";
  incident.ownerApprovedAt = now;
  incident.updatedAt = now;
  incident.ownerNote = ownerNote;
  if (!incident.actionsTaken.includes("Owner approved remediation plan")) {
    incident.actionsTaken.push("Owner approved remediation plan");
  }
  incidents.set(incidentId, incident);

  await dispatchOwnerAlert(
    `[UR Ops] ✅ Approved: ${incident.title}`,
    `You approved incident ${incidentId}.\n\nNote: ${ownerNote ?? "(none)"}\n\nFinal okay recorded. Ops AIs may proceed with the approved plan.`,
    incidentId,
  );
  return incident;
}

export async function rejectOpsIncident(
  incidentId: string,
  ownerNote: string,
): Promise<OpsIncident> {
  const incident = incidents.get(incidentId);
  if (!incident) {
    throw new Error("Incident not found");
  }
  const now = new Date().toISOString();
  incident.status = "rejected";
  incident.updatedAt = now;
  incident.ownerNote = ownerNote;
  incident.actionsTaken.push(`Owner rejected plan: ${ownerNote}`);
  incidents.set(incidentId, incident);

  await dispatchOwnerAlert(
    `[UR Ops] ❌ Rejected: ${incident.title}`,
    `You rejected incident ${incidentId}.\n\nReason: ${ownerNote}`,
    incidentId,
  );
  return incident;
}

export async function resolveOpsIncident(incidentId: string): Promise<OpsIncident> {
  const incident = incidents.get(incidentId);
  if (!incident) {
    throw new Error("Incident not found");
  }
  incident.status = "resolved";
  incident.updatedAt = new Date().toISOString();
  incidents.set(incidentId, incident);
  return incident;
}

export type HealthCheckFinding = {
  severity: OpsIncidentSeverity;
  category: OpsIncidentCategory;
  title: string;
  problem: string;
  proposedFix: string;
  sourceAi: OwnerPlatformAiId;
};

export function runPlatformHealthChecks(): HealthCheckFinding[] {
  const findings: HealthCheckFinding[] = [];

  if (!isGoogleCloudAiConfigured()) {
    findings.push({
      severity: "high",
      category: "config",
      title: "Gemini AI not configured",
      problem: "CONTENTMATE_GEMINI_API_KEY or Vertex AI credentials are missing — AI chat will fail.",
      proposedFix: "Add CONTENTMATE_GEMINI_API_KEY to .env and restart the API server.",
      sourceAi: "platform-doctor-ai",
    });
  }

  if (!ENV.supabaseUrl || ENV.supabaseUrl.includes("placeholder")) {
    findings.push({
      severity: "medium",
      category: "config",
      title: "Supabase auth not fully configured",
      problem: "Supabase URL appears placeholder — user login/token verification may fail.",
      proposedFix: "Set EXPO_PUBLIC_SUPABASE_URL and keys to your real Supabase project.",
      sourceAi: "platform-administration-ai",
    });
  }

  if (!ENV.platformOwnerEmail && !ENV.platformOwnerSupabaseId) {
    findings.push({
      severity: "high",
      category: "compliance",
      title: "Platform owner not configured",
      problem: "PLATFORM_OWNER_EMAIL or PLATFORM_OWNER_SUPABASE_ID is unset — owner-only ops AIs cannot be restricted properly.",
      proposedFix: "Set PLATFORM_OWNER_EMAIL and/or PLATFORM_OWNER_SUPABASE_ID in .env.",
      sourceAi: "platform-administration-ai",
    });
  }

  const namespaces: ApiNamespace[] = [
    "aiCreators",
    "chat",
    "auth",
    "webSearch",
  ];
  for (const ns of namespaces) {
    const circuit = getNamespaceCircuitStatus(ns);
    if (circuit.isOpen) {
      findings.push({
        severity: "critical",
        category: "security",
        title: `API circuit open: ${ns}`,
        problem: `The ${ns} API namespace circuit breaker is OPEN due to repeated failures.`,
        proposedFix: "Review server logs, fix root errors, wait for circuit reset or restart API.",
        sourceAi: "platform-security-ai",
      });
    }
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    findings.push({
      severity: "low",
      category: "monitoring",
      title: "External owner notifications not configured",
      problem: "Forge notification service not set — alerts appear in Owner Ops Console and server logs only.",
      proposedFix: "Configure BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY for push/email alerts.",
      sourceAi: "platform-doctor-ai",
    });
  }

  return findings;
}

export async function runPlatformHealthScan(): Promise<{
  findings: HealthCheckFinding[];
  incidentsCreated: OpsIncident[];
}> {
  const findings = runPlatformHealthChecks();
  const incidentsCreated: OpsIncident[] = [];

  for (const finding of findings) {
    if (finding.severity === "low") continue;
    const incident = await createOpsIncident({
      sourceAi: finding.sourceAi,
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      problem: finding.problem,
      proposedFix: finding.proposedFix,
      actionsTaken: ["Automated health scan detected this issue", "Awaiting owner approval before remediation"],
    });
    incidentsCreated.push(incident);
  }

  return { findings, incidentsCreated };
}

export function inferIncidentFromOpsChat(
  creatorId: string,
  userMessage: string,
  aiReply: string,
): {
  shouldFile: boolean;
  severity: OpsIncidentSeverity;
  category: OpsIncidentCategory;
  title: string;
  problem: string;
  proposedFix: string;
} | null {
  if (!isOwnerOnlyPlatformAi(creatorId)) return null;

  const text = `${userMessage}\n${aiReply}`.toLowerCase();
  const trouble =
    /incident|breach|malware|virus|attack|unauthorized|error|bug|failed|down|outage|violation|compliance|blocked|anomal/.test(
      text,
    );
  if (!trouble) return null;

  let category: OpsIncidentCategory = "monitoring";
  if (/malware|virus|attack|unauthorized|breach/.test(text)) category = "malware";
  else if (/compliance|violation|policy|rules/.test(text)) category = "compliance";
  else if (/bug|error|failed|crash/.test(text)) category = "bug";
  else if (/security|auth|token|phish/.test(text)) category = "security";

  const severity: OpsIncidentSeverity =
    /critical|breach|malware|outage|down/.test(text) ? "high" : "medium";

  const titleMatch = aiReply.match(/INCIDENT SUMMARY:\s*(.+)/i);
  const problemMatch = aiReply.match(/PROBLEM:\s*([\s\S]+?)(?=ACTIONS TAKEN:|PROPOSED|$)/i);
  const fixMatch = aiReply.match(/PROPOSED FIX:\s*([\s\S]+?)(?=STATUS:|$)/i);

  return {
    shouldFile: true,
    severity,
    category,
    title: titleMatch?.[1]?.trim() ?? `Ops alert from ${creatorId}`,
    problem: problemMatch?.[1]?.trim() ?? userMessage.slice(0, 500),
    proposedFix:
      fixMatch?.[1]?.trim() ??
      "Review the AI conversation in Owner Ops and approve a remediation plan.",
  };
}

export function getOpsDashboardSummary() {
  const all = listOpsIncidents();
  return {
    totalIncidents: all.length,
    awaitingApproval: all.filter((i) => i.status === "awaiting_owner_approval").length,
    approved: all.filter((i) => i.status === "approved").length,
    resolved: all.filter((i) => i.status === "resolved").length,
    unreadNotifications: ownerNotifications.filter((n) => !n.read).length,
    lastScanFindings: runPlatformHealthChecks().length,
  };
}

export function markNotificationsRead() {
  for (const n of ownerNotifications) {
    n.read = true;
  }
}
