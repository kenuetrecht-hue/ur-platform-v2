/**
 * MySQL persistence for Command Center, incidents, sandbox repairs, and section flags.
 * Best-effort: in-memory still works when MySQL is down.
 */

import { desc, eq } from "drizzle-orm";
import {
  ownerCommandCenterEvents,
  ownerPushDevices,
  platformOpsIncidents,
  platformOpsNotifications,
  platformOpsSandboxRepairs,
  platformSectionFlags,
} from "../drizzle/schema";
import { getDb } from "./db";
import type { OwnerCommandEvent } from "../lib/owner-command-center-types";
import type { OpsSandboxRepair } from "../lib/ops-sandbox-repair-types";

function skipDbWrites(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export type PersistableIncident = {
  id: string;
  sourceAi: string;
  severity: string;
  category: string;
  title: string;
  problem: string;
  proposedFix: string;
  actionsTaken: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  ownerApprovedAt?: string;
  ownerNote?: string;
  ownerInstructions?: string;
  autoIsolated?: boolean;
  deployProposal?: unknown;
  remediationResults?: unknown;
  sandboxRepair?: unknown;
  affectedSectionId?: string;
  sectionAction?: string;
};

export type PersistableNotification = {
  id: string;
  incidentId: string;
  title: string;
  content: string;
  createdAt: string;
  read: boolean;
};

export type PersistableSectionFlag = {
  id: string;
  enabled: boolean;
  maintenanceMessage: string;
  disabledAt: string | null;
  disabledBy: string | null;
  incidentId: string | null;
  reason: string | null;
  updatedAt: string;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export async function persistOwnerCommandEvent(event: OwnerCommandEvent): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(ownerCommandCenterEvents)
      .values({
        id: event.id,
        createdAt: new Date(event.createdAt),
        kind: event.kind,
        severity: event.severity,
        sourceAiId: event.sourceAiId,
        sourceAiName: event.sourceAiName.slice(0, 120),
        english: event.english,
        terminalLine: event.terminalLine.slice(0, 255),
        relatedAiIdsJson: JSON.stringify(event.relatedAiIds),
        relatedAiNamesJson: JSON.stringify(event.relatedAiNames),
        incidentId: event.incidentId,
        sectionId: event.sectionId,
        userIdSuffix: event.userIdSuffix,
        translated: event.translated,
        originalExcerpt: event.originalExcerpt,
      })
      .onDuplicateKeyUpdate({
        set: {
          english: event.english,
          terminalLine: event.terminalLine.slice(0, 255),
        },
      });
  } catch (error) {
    console.warn("[platform-ops] persist command event failed:", error);
  }
}

export async function loadOwnerCommandEventsFromDb(limit = 2000): Promise<OwnerCommandEvent[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(ownerCommandCenterEvents)
      .orderBy(desc(ownerCommandCenterEvents.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      kind: row.kind as OwnerCommandEvent["kind"],
      severity: row.severity as OwnerCommandEvent["severity"],
      sourceAiId: row.sourceAiId,
      sourceAiName: row.sourceAiName,
      english: row.english,
      terminalLine: row.terminalLine,
      relatedAiIds: parseJson<string[]>(row.relatedAiIdsJson, []),
      relatedAiNames: parseJson<string[]>(row.relatedAiNamesJson, []),
      incidentId: row.incidentId ?? undefined,
      sectionId: row.sectionId ?? undefined,
      userIdSuffix: row.userIdSuffix ?? undefined,
      translated: row.translated,
      originalExcerpt: row.originalExcerpt ?? undefined,
    }));
  } catch (error) {
    console.warn("[platform-ops] load command events failed:", error);
    return [];
  }
}

export async function persistOpsIncident(incident: PersistableIncident): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(platformOpsIncidents)
      .values({
        id: incident.id,
        sourceAi: incident.sourceAi,
        severity: incident.severity,
        category: incident.category,
        title: incident.title.slice(0, 240),
        problem: incident.problem,
        proposedFix: incident.proposedFix,
        status: incident.status,
        actionsTakenJson: JSON.stringify(incident.actionsTaken),
        deployProposalJson: incident.deployProposal ? JSON.stringify(incident.deployProposal) : null,
        remediationResultsJson: incident.remediationResults
          ? JSON.stringify(incident.remediationResults)
          : null,
        sandboxRepairJson: incident.sandboxRepair ? JSON.stringify(incident.sandboxRepair) : null,
        affectedSectionId: incident.affectedSectionId,
        sectionAction: incident.sectionAction,
        autoIsolated: Boolean(incident.autoIsolated),
        ownerApprovedAt: incident.ownerApprovedAt ? new Date(incident.ownerApprovedAt) : null,
        ownerNote: incident.ownerNote,
        ownerInstructions: incident.ownerInstructions,
        createdAt: new Date(incident.createdAt),
        updatedAt: new Date(incident.updatedAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          status: incident.status,
          actionsTakenJson: JSON.stringify(incident.actionsTaken),
          deployProposalJson: incident.deployProposal ? JSON.stringify(incident.deployProposal) : null,
          remediationResultsJson: incident.remediationResults
            ? JSON.stringify(incident.remediationResults)
            : null,
          sandboxRepairJson: incident.sandboxRepair ? JSON.stringify(incident.sandboxRepair) : null,
          autoIsolated: Boolean(incident.autoIsolated),
          ownerApprovedAt: incident.ownerApprovedAt ? new Date(incident.ownerApprovedAt) : null,
          ownerNote: incident.ownerNote,
          ownerInstructions: incident.ownerInstructions,
          updatedAt: new Date(incident.updatedAt),
        },
      });
  } catch (error) {
    console.warn("[platform-ops] persist incident failed:", error);
  }
}

export async function loadOpsIncidentsFromDb(): Promise<PersistableIncident[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(platformOpsIncidents);
    return rows.map((row) => ({
      id: row.id,
      sourceAi: row.sourceAi,
      severity: row.severity,
      category: row.category,
      title: row.title,
      problem: row.problem,
      proposedFix: row.proposedFix,
      actionsTaken: parseJson<string[]>(row.actionsTakenJson, []),
      status: row.status,
      createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
      ownerApprovedAt: toIso(row.ownerApprovedAt),
      ownerNote: row.ownerNote ?? undefined,
      ownerInstructions: row.ownerInstructions ?? undefined,
      autoIsolated: row.autoIsolated,
      deployProposal: parseJson(row.deployProposalJson, undefined),
      remediationResults: parseJson(row.remediationResultsJson, undefined),
      sandboxRepair: parseJson(row.sandboxRepairJson, undefined),
      affectedSectionId: row.affectedSectionId ?? undefined,
      sectionAction: row.sectionAction ?? undefined,
    }));
  } catch (error) {
    console.warn("[platform-ops] load incidents failed:", error);
    return [];
  }
}

export async function persistOpsNotification(note: PersistableNotification): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(platformOpsNotifications)
      .values({
        id: note.id,
        incidentId: note.incidentId,
        title: note.title.slice(0, 240),
        content: note.content,
        createdAt: new Date(note.createdAt),
        read: note.read,
      })
      .onDuplicateKeyUpdate({ set: { read: note.read } });
  } catch (error) {
    console.warn("[platform-ops] persist notification failed:", error);
  }
}

export async function loadOpsNotificationsFromDb(): Promise<PersistableNotification[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(platformOpsNotifications)
      .orderBy(desc(platformOpsNotifications.createdAt))
      .limit(200);
    return rows.map((row) => ({
      id: row.id,
      incidentId: row.incidentId,
      title: row.title,
      content: row.content,
      createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      read: row.read,
    }));
  } catch (error) {
    console.warn("[platform-ops] load notifications failed:", error);
    return [];
  }
}

export async function persistSectionFlag(flag: PersistableSectionFlag): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(platformSectionFlags)
      .values({
        id: flag.id,
        enabled: flag.enabled,
        maintenanceMessage: flag.maintenanceMessage.slice(0, 500),
        disabledAt: flag.disabledAt ? new Date(flag.disabledAt) : null,
        disabledBy: flag.disabledBy,
        incidentId: flag.incidentId,
        reason: flag.reason,
        updatedAt: new Date(flag.updatedAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          enabled: flag.enabled,
          maintenanceMessage: flag.maintenanceMessage.slice(0, 500),
          disabledAt: flag.disabledAt ? new Date(flag.disabledAt) : null,
          disabledBy: flag.disabledBy,
          incidentId: flag.incidentId,
          reason: flag.reason,
          updatedAt: new Date(flag.updatedAt),
        },
      });
  } catch (error) {
    console.warn("[platform-ops] persist section flag failed:", error);
  }
}

export async function loadSectionFlagsFromDb(): Promise<PersistableSectionFlag[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(platformSectionFlags);
    return rows.map((row) => ({
      id: row.id,
      enabled: row.enabled,
      maintenanceMessage: row.maintenanceMessage,
      disabledAt: toIso(row.disabledAt) ?? null,
      disabledBy: row.disabledBy,
      incidentId: row.incidentId,
      reason: row.reason,
      updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("[platform-ops] load section flags failed:", error);
    return [];
  }
}

export async function persistSandboxRepair(repair: OpsSandboxRepair): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(platformOpsSandboxRepairs)
      .values({
        id: repair.id,
        incidentId: repair.incidentId,
        title: repair.title.slice(0, 240),
        status: repair.status,
        diagnosis: repair.diagnosis,
        planStepsJson: JSON.stringify(repair.planSteps),
        liveActionsJson: JSON.stringify(repair.liveActions),
        checksJson: JSON.stringify(repair.checks),
        wouldTouchLiveJson: JSON.stringify(repair.wouldTouchLive),
        appliedLive: repair.appliedLive,
        createdAt: new Date(repair.createdAt),
      })
      .onDuplicateKeyUpdate({
        set: {
          status: repair.status,
          diagnosis: repair.diagnosis,
          planStepsJson: JSON.stringify(repair.planSteps),
          liveActionsJson: JSON.stringify(repair.liveActions),
          checksJson: JSON.stringify(repair.checks),
          wouldTouchLiveJson: JSON.stringify(repair.wouldTouchLive),
          appliedLive: repair.appliedLive,
        },
      });
  } catch (error) {
    console.warn("[platform-ops] persist sandbox repair failed:", error);
  }
}

export async function loadSandboxRepairsFromDb(): Promise<OpsSandboxRepair[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(platformOpsSandboxRepairs);
    return rows.map((row) => ({
      id: row.id,
      incidentId: row.incidentId,
      title: row.title,
      status: row.status as OpsSandboxRepair["status"],
      diagnosis: row.diagnosis,
      planSteps: parseJson<string[]>(row.planStepsJson, []),
      liveActions: parseJson(row.liveActionsJson, []),
      checks: parseJson(row.checksJson, []),
      wouldTouchLive: parseJson<string[]>(row.wouldTouchLiveJson, []),
      appliedLive: row.appliedLive,
      createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("[platform-ops] load sandbox repairs failed:", error);
    return [];
  }
}

export async function persistOwnerPushDevice(input: {
  token: string;
  ownerUserId: string;
  platform: string;
}): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db
      .insert(ownerPushDevices)
      .values({
        token: input.token.slice(0, 255),
        ownerUserId: input.ownerUserId.slice(0, 128),
        platform: input.platform.slice(0, 16),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          ownerUserId: input.ownerUserId.slice(0, 128),
          platform: input.platform.slice(0, 16),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.warn("[platform-ops] persist owner push device failed:", error);
  }
}

export async function loadOwnerPushTokensFromDb(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(ownerPushDevices);
    return rows.map((row) => row.token).filter(Boolean);
  } catch (error) {
    console.warn("[platform-ops] load owner push tokens failed:", error);
    return [];
  }
}

export async function markOpsNotificationsReadInDb(): Promise<void> {
  if (skipDbWrites()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(platformOpsNotifications).set({ read: true }).where(eq(platformOpsNotifications.read, false));
  } catch (error) {
    console.warn("[platform-ops] mark notifications read failed:", error);
  }
}
