/**
 * Owner compliance archive — copy AI/ops records off the laptop for IRS / official review.
 * Writes JSON to OWNER_AUDIT_BACKUP_DIR or data/owner-audit-archive (gitignored).
 */

import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { loadOpsIncidentsFromDb, loadOpsNotificationsFromDb, loadOwnerCommandEventsFromDb, loadSandboxRepairsFromDb, loadSectionFlagsFromDb } from "../db-platform-ops";
import { listOwnerCommandEvents } from "./owner-command-center-service";
import { listSandboxRepairs } from "./ops-sandbox-repair-service";
import { listPlatformSectionStates } from "./platform-section-flags-service";
import type { OwnerComplianceArchive, OwnerComplianceArchiveMeta } from "../../lib/owner-compliance-archive-types";

const DEFAULT_RELATIVE_DIR = path.join("data", "owner-audit-archive");
const LAST_META_FILE = "last-backup.json";

function resolveBackupDir(): string {
  const configured = process.env.OWNER_AUDIT_BACKUP_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), DEFAULT_RELATIVE_DIR);
}

function stamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function buildOwnerComplianceArchive(reason: string): Promise<OwnerComplianceArchive> {
  const [dbIncidents, dbEvents, dbRepairs, dbNotes, dbFlags] = await Promise.all([
    loadOpsIncidentsFromDb(),
    loadOwnerCommandEventsFromDb(20_000),
    loadSandboxRepairsFromDb(),
    loadOpsNotificationsFromDb(),
    loadSectionFlagsFromDb(),
  ]);

  const incidents = dbIncidents;
  const commandCenterEvents = dbEvents.length > 0 ? dbEvents : listOwnerCommandEvents({ limit: 200 });
  const sandboxRepairs = dbRepairs.length > 0 ? dbRepairs : listSandboxRepairs();
  const notifications = dbNotes;
  const sectionFlags = dbFlags.length > 0 ? dbFlags : listPlatformSectionStates();

  return {
    generatedAt: new Date().toISOString(),
    reason,
    llc: "UR Platform LLC",
    purpose: "Owner business record of AI hive talks, incidents, sandbox repairs, and protection actions.",
    notice:
      "This archive is for your records if the IRS or another official asks what the AIs did. It is not a tax return, not legal advice, and not a substitute for your accountant.",
    backupDir: resolveBackupDir(),
    counts: {
      incidents: incidents.length,
      commandCenterEvents: commandCenterEvents.length,
      sandboxRepairs: sandboxRepairs.length,
      notifications: notifications.length,
      sectionFlags: sectionFlags.length,
    },
    incidents,
    commandCenterEvents,
    sandboxRepairs,
    notifications,
    sectionFlags,
  };
}

function isTestRuntime(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export async function writeOwnerComplianceSnapshot(reason: string): Promise<OwnerComplianceArchiveMeta> {
  const archive = await buildOwnerComplianceArchive(reason);
  const dir = resolveBackupDir();
  if (isTestRuntime() && !process.env.OWNER_AUDIT_BACKUP_DIR) {
    return {
      generatedAt: archive.generatedAt,
      reason,
      llc: archive.llc,
      purpose: archive.purpose,
      notice: archive.notice,
      backupDir: dir,
      fileName: "skipped-in-tests.json",
      counts: archive.counts,
    };
  }
  await mkdir(dir, { recursive: true });
  const fileName = `ur-ops-archive-${stamp()}.json`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, JSON.stringify(archive, null, 2), "utf8");

  const meta: OwnerComplianceArchiveMeta = {
    generatedAt: archive.generatedAt,
    reason,
    llc: archive.llc,
    purpose: archive.purpose,
    notice: archive.notice,
    backupDir: dir,
    fileName,
    counts: archive.counts,
  };
  await writeFile(path.join(dir, LAST_META_FILE), JSON.stringify(meta, null, 2), "utf8");
  return meta;
}

export async function readLastComplianceBackup(): Promise<OwnerComplianceArchiveMeta | null> {
  try {
    const raw = await readFile(path.join(resolveBackupDir(), LAST_META_FILE), "utf8");
    return JSON.parse(raw) as OwnerComplianceArchiveMeta;
  } catch {
    return null;
  }
}

export async function maybeRotateOwnerComplianceBackup(): Promise<void> {
  const last = await readLastComplianceBackup();
  const ageMs = last ? Date.now() - Date.parse(last.generatedAt) : Number.POSITIVE_INFINITY;
  if (ageMs < 6 * 60 * 60 * 1000) return;
  await writeOwnerComplianceSnapshot(last ? "scheduled_6h" : "first_backup");
}

export function getOwnerAuditBackupDirHint(): string {
  return resolveBackupDir();
}

export function _ownerAuditBackupDirForTests(): string {
  return resolveBackupDir();
}
