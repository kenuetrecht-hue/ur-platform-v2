import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
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
import type { PlatformSectionId } from "../../lib/platform-section-flags";
import { inferSectionFromOpsText } from "../../lib/platform-section-flags";
import {
  disablePlatformSection,
  enablePlatformSection,
  countDisabledSections,
  listPlatformSectionStates,
} from "./platform-section-flags-service";
import {
  OWNER_REMEDIATION_CONFIRM_PHRASE,
  isOwnerRemediationConfirmed,
  type OpsDeployProposal,
} from "../../lib/platform-ops-remediation-types";
import { buildDefaultDeployProposal, apiNamespaceToSection } from "../../lib/platform-ops-section-map";
import {
  executeApprovedRemediation,
  sanitizeDeployProposal,
} from "./platform-ops-remediation-service";

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
  | "resolved"
  | "section_isolated"
  | "fix_in_progress"
  | "deploy_executed";

export type OpsSectionAction = "isolate" | "reopen";

/** Isolate immediately for attacks or outages; never isolate a reopen request. */
export function shouldAutoIsolateIncident(input: {
  autoIsolateSection?: boolean;
  affectedSectionId?: PlatformSectionId;
  sectionAction?: OpsSectionAction;
  severity: OpsIncidentSeverity;
  category: OpsIncidentCategory;
}): boolean {
  if (input.autoIsolateSection === false) return false;
  if (!input.affectedSectionId) return false;
  if (input.sectionAction === "reopen") return false;
  const securityEvent =
    input.category === "security" ||
    input.category === "malware" ||
    input.severity === "critical";
  if (securityEvent) return true;
  return input.severity !== "low";
}

export function assertOwnerRemediationConfirmation(phrase: string | undefined): void {
  if (!isOwnerRemediationConfirmed(phrase)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Type ${OWNER_REMEDIATION_CONFIRM_PHRASE} to finalize this fix. Nothing is applied until you confirm.`,
    });
  }
}

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
  ownerInstructions?: string;
  /** Section shut down immediately when incident was filed. */
  autoIsolated?: boolean;
  deployProposal?: OpsDeployProposal;
  remediationResults?: Array<{ actionId: string; success: boolean; message: string }>;
  /** When set, ops AIs isolate this section while owner reviews the fix plan. */
  affectedSectionId?: PlatformSectionId;
  sectionAction?: OpsSectionAction;
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
  affectedSectionId?: PlatformSectionId;
  sectionAction?: OpsSectionAction;
  deployProposal?: OpsDeployProposal;
  /** When true (default), isolate affected section immediately and alert owner. */
  autoIsolateSection?: boolean;
}): Promise<OpsIncident> {
  const openDuplicate = [...incidents.values()].find(
    (i) =>
      i.title === input.title &&
      i.affectedSectionId === input.affectedSectionId &&
      i.status !== "resolved" &&
      i.status !== "rejected",
  );
  if (openDuplicate) {
    return openDuplicate;
  }

  const now = new Date().toISOString();
  const shouldAutoIsolate = shouldAutoIsolateIncident({
    autoIsolateSection: input.autoIsolateSection,
    affectedSectionId: input.affectedSectionId,
    sectionAction: input.sectionAction,
    severity: input.severity,
    category: input.category,
  });

  const deployProposal = sanitizeDeployProposal(
    input.deployProposal ??
      buildDefaultDeployProposal({
        proposedFix: input.proposedFix,
        category: input.category,
        apiNamespace: undefined,
        reopenAfterFix: Boolean(input.affectedSectionId),
      }),
  );

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
    affectedSectionId: input.affectedSectionId,
    sectionAction: input.sectionAction ?? (input.affectedSectionId ? "isolate" : undefined),
    deployProposal,
  };

  if (shouldAutoIsolate && input.affectedSectionId) {
    disablePlatformSection({
      sectionId: input.affectedSectionId,
      reason: input.problem,
      incidentId: incident.id,
      disabledBy: input.sourceAi,
      maintenanceMessage: `${input.title} — this area is temporarily offline while UR ops investigates. The rest of the platform stays online.`,
    });
    incident.autoIsolated = true;
    incident.status = "section_isolated";
    incident.actionsTaken.push(
      `Section auto-isolated: ${input.affectedSectionId} (owner approval required before deploy/reopen)`,
    );
  }

  incidents.set(incident.id, incident);

  const content = [
    `Severity: ${incident.severity.toUpperCase()}`,
    `Category: ${incident.category}`,
    `Source: ${incident.sourceAi}`,
    incident.autoIsolated ? `\n🛑 SECTION OFFLINE: ${incident.affectedSectionId}` : "",
    "",
    "PROBLEM:",
    incident.problem,
    "",
    "PROPOSED FIX:",
    incident.proposedFix,
    "",
    "DEPLOY / REMEDIATION PLAN:",
    incident.deployProposal?.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") ?? incident.proposedFix,
    "",
    incident.actionsTaken.length
      ? `ACTIONS TAKEN:\n${incident.actionsTaken.map((a) => `• ${a}`).join("\n")}`
      : "",
    "",
    `⏳ Awaiting YOUR typed ${OWNER_REMEDIATION_CONFIRM_PHRASE} in Owner Ops. Doctor / Administration / Security AIs cannot finalize.`,
  ].join("\n");

  await dispatchOwnerAlert(`[UR Ops] ${incident.title}`, content, incident.id);
  return incident;
}

export async function approveOpsIncident(
  incidentId: string,
  ownerNote?: string,
  confirmPhrase?: string,
): Promise<OpsIncident> {
  return executeIncidentRemediation(incidentId, ownerNote, confirmPhrase);
}

/** Owner final OK — run allowlisted remediation/deploy steps only. */
export async function executeIncidentRemediation(
  incidentId: string,
  ownerNote?: string,
  confirmPhrase?: string,
): Promise<OpsIncident> {
  assertOwnerRemediationConfirmation(confirmPhrase);
  const incident = incidents.get(incidentId);
  if (!incident) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
  }
  if (incident.status === "rejected" || incident.status === "resolved") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Incident is already closed." });
  }

  const now = new Date().toISOString();
  incident.status = "fix_in_progress";
  incident.ownerApprovedAt = now;
  incident.updatedAt = now;
  incident.ownerNote = ownerNote;
  incident.actionsTaken.push("Owner approved fix/deploy plan — executing allowlisted remediation");

  const proposal =
    incident.deployProposal ??
    buildDefaultDeployProposal({
      proposedFix: incident.proposedFix,
      category: incident.category,
      reopenAfterFix: Boolean(incident.affectedSectionId),
    });

  const results = await executeApprovedRemediation({
    incidentId,
    proposal,
    affectedSectionId: incident.affectedSectionId,
    ownerNote,
    onRerunHealthScan: async () => {
      const scan = await runPlatformHealthScan();
      return `Health scan — ${scan.findings.length} finding(s), ${scan.incidentsCreated.length} new incident(s).`;
    },
  });

  incident.remediationResults = results;
  incident.status = results.every((r) => r.success) ? "deploy_executed" : "approved";
  incident.actionsTaken.push(
    ...results.map((r) => `${r.success ? "✓" : "✗"} ${r.actionId}: ${r.message}`),
  );
  incidents.set(incidentId, incident);

  await dispatchOwnerAlert(
    `[UR Ops] ✅ Fix approved: ${incident.title}`,
    [
      `You approved incident ${incidentId}.`,
      "",
      ownerNote ? `Your note: ${ownerNote}` : "",
      "",
      "REMEDIATION RESULTS:",
      ...results.map((r) => `${r.success ? "✓" : "✗"} ${r.actionId}: ${r.message}`),
      "",
      incident.affectedSectionId && !results.some((r) => r.actionId === "reopen_section")
        ? `Section "${incident.affectedSectionId}" may still be offline — reopen when verified.`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    incidentId,
  );
  return incident;
}

export async function submitOwnerInstructions(
  incidentId: string,
  instructions: string,
): Promise<OpsIncident> {
  const incident = incidents.get(incidentId);
  if (!incident) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
  }
  const trimmed = instructions.trim().slice(0, 2000);
  incident.ownerInstructions = trimmed;
  incident.updatedAt = new Date().toISOString();
  incident.actionsTaken.push(`Owner instructions: ${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}`);
  incidents.set(incidentId, incident);

  await dispatchOwnerAlert(
    `[UR Ops] 📋 Your instructions recorded`,
    `Incident: ${incident.title} (${incidentId})\n\nYour instructions:\n${trimmed}\n\nOps AIs will follow your direction. Approve the fix plan when ready, or reject if you want a different approach.`,
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
    throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
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
    throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
  }
  incident.status = "resolved";
  incident.updatedAt = new Date().toISOString();
  incidents.set(incidentId, incident);
  return incident;
}

export async function proposeSectionMaintenance(input: {
  sourceAi: OwnerPlatformAiId;
  sectionId: PlatformSectionId;
  action: OpsSectionAction;
  reason: string;
  proposedFix: string;
  severity?: OpsIncidentSeverity;
  autoIsolateSection?: boolean;
}): Promise<OpsIncident> {
  const meta = listPlatformSectionStates().find((s) => s.id === input.sectionId);
  const actionLabel = input.action === "isolate" ? "Isolate section" : "Reopen section";
  return createOpsIncident({
    sourceAi: input.sourceAi,
    severity: input.severity ?? (input.action === "isolate" ? "high" : "medium"),
    category: "bug",
    title: `${actionLabel}: ${meta?.label ?? input.sectionId}`,
    problem: input.reason,
    proposedFix: input.proposedFix,
    affectedSectionId: input.sectionId,
    sectionAction: input.action,
    autoIsolateSection: input.autoIsolateSection,
    actionsTaken: [
      `${input.sourceAi} proposed ${input.action} for ${input.sectionId}`,
      "Awaiting owner typed I APPROVE before changing section availability",
    ],
  });
}

export function ownerDisableSection(input: {
  sectionId: PlatformSectionId;
  reason: string;
  maintenanceMessage?: string;
  incidentId?: string;
}): ReturnType<typeof disablePlatformSection> {
  return disablePlatformSection({
    ...input,
    disabledBy: "owner",
  });
}

export function ownerEnableSection(input: {
  sectionId: PlatformSectionId;
  ownerNote?: string;
}): ReturnType<typeof enablePlatformSection> {
  return enablePlatformSection(input);
}

export type HealthCheckFinding = {
  severity: OpsIncidentSeverity;
  category: OpsIncidentCategory;
  title: string;
  problem: string;
  proposedFix: string;
  sourceAi: OwnerPlatformAiId;
  affectedSectionId?: PlatformSectionId;
  apiNamespace?: string;
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
      affectedSectionId: "ai_chat",
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
      const sectionId = apiNamespaceToSection(ns);
      findings.push({
        severity: "critical",
        category: "security",
        title: `API circuit open: ${ns}`,
        problem: `The ${ns} API namespace circuit breaker is OPEN due to repeated failures.`,
        proposedFix:
          "Review server logs, fix root errors, then approve reset_api_circuit remediation in Owner Ops.",
        sourceAi: "platform-security-ai",
        affectedSectionId: sectionId ?? undefined,
        apiNamespace: ns,
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
      affectedSectionId: finding.affectedSectionId,
      sectionAction: finding.affectedSectionId ? "isolate" : undefined,
      deployProposal: buildDefaultDeployProposal({
        proposedFix: finding.proposedFix,
        category: finding.category,
        apiNamespace: finding.apiNamespace,
        reopenAfterFix: Boolean(finding.affectedSectionId),
      }),
      actionsTaken: [
        "Automated health scan detected this issue",
        finding.affectedSectionId
          ? `Affected section ${finding.affectedSectionId} isolated pending your OK on the fix plan`
          : "Awaiting owner approval on remediation plan",
      ],
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
  affectedSectionId?: PlatformSectionId;
  sectionAction?: OpsSectionAction;
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
  const sectionMatch = aiReply.match(/SECTION:\s*([a-z0-9_]+)/i);
  const inferredSection =
    (sectionMatch?.[1] as PlatformSectionId | undefined) ?? inferSectionFromOpsText(text);
  const wantsIsolate = /isolat|shut down|disable|maintenance|take offline|kill switch/.test(text);
  const wantsReopen = /reopen|bring back|re-enable|restore|open (?:the )?section/.test(text);
  const sectionAction: OpsSectionAction | undefined = inferredSection
    ? wantsReopen
      ? "reopen"
      : "isolate"
    : undefined;

  return {
    shouldFile: true,
    severity,
    category,
    title: titleMatch?.[1]?.trim() ?? `Ops alert from ${creatorId}`,
    problem: problemMatch?.[1]?.trim() ?? userMessage.slice(0, 500),
    proposedFix:
      fixMatch?.[1]?.trim() ??
      "Review the AI conversation in Owner Ops and approve a remediation plan.",
    affectedSectionId: inferredSection ?? undefined,
    sectionAction,
  };
}

export function getOpsDashboardSummary() {
  const all = listOpsIncidents();
  return {
    totalIncidents: all.length,
    awaitingApproval: all.filter(
      (i) => i.status === "awaiting_owner_approval" || i.status === "section_isolated",
    ).length,
    approved: all.filter(
      (i) =>
        i.status === "approved" ||
        i.status === "fix_in_progress" ||
        i.status === "deploy_executed",
    ).length,
    resolved: all.filter((i) => i.status === "resolved").length,
    sectionIsolated: all.filter((i) => i.autoIsolated || i.status === "section_isolated").length,
    sectionsDisabled: countDisabledSections(),
    unreadNotifications: ownerNotifications.filter((n) => !n.read).length,
    lastScanFindings: runPlatformHealthChecks().length,
  };
}

export function markNotificationsRead() {
  for (const n of ownerNotifications) {
    n.read = true;
  }
}

/** Test helper — clears in-memory ops state. */
export function _resetOpsStateForTests(): void {
  incidents.clear();
  ownerNotifications.length = 0;
}
