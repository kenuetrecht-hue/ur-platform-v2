import { mkdtemp, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldWakeOwner } from "../lib/owner-emergency";
import {
  buildOwnerComplianceArchive,
  writeOwnerComplianceSnapshot,
} from "../server/_core/owner-compliance-archive-service";
import { recordOwnerCommandEvent, _resetOwnerCommandCenterForTests } from "../server/_core/owner-command-center-service";
import { getOwnerEmergencyState } from "../server/_core/owner-emergency-service";
import { createOpsIncident, _resetOpsStateForTests } from "../server/_core/platform-ops-service";
import { _resetPlatformSectionsForTests } from "../server/_core/platform-section-flags-service";
import { _resetSandboxRepairsForTests } from "../server/_core/ops-sandbox-repair-service";
import { registerOwnerPushToken, listOwnerPushTokens, _resetOwnerPushTokensForTests } from "../server/_core/owner-push-service";

describe("owner emergency wake rules", () => {
  it("wakes for high, critical, isolate, and security", () => {
    expect(shouldWakeOwner({ severity: "low" })).toBe(false);
    expect(shouldWakeOwner({ severity: "medium" })).toBe(false);
    expect(shouldWakeOwner({ severity: "high" })).toBe(true);
    expect(shouldWakeOwner({ severity: "critical" })).toBe(true);
    expect(shouldWakeOwner({ severity: "low", autoIsolated: true })).toBe(true);
    expect(shouldWakeOwner({ severity: "low", category: "malware" })).toBe(true);
  });
});

describe("owner push registration", () => {
  beforeEach(() => {
    _resetOwnerPushTokensForTests();
  });

  it("stores only Expo owner tokens", async () => {
    registerOwnerPushToken({
      token: "not-a-token",
      ownerUserId: "1",
      platform: "android",
    });
    registerOwnerPushToken({
      token: "ExponentPushToken[abc123]",
      ownerUserId: "1",
      platform: "android",
    });
    expect(await listOwnerPushTokens()).toEqual(["ExponentPushToken[abc123]"]);
  });
});

describe("owner compliance archive", () => {
  const previousDir = process.env.OWNER_AUDIT_BACKUP_DIR;

  beforeEach(() => {
    _resetOwnerCommandCenterForTests();
    _resetOpsStateForTests();
    _resetPlatformSectionsForTests();
    _resetSandboxRepairsForTests();
  });

  afterEach(() => {
    if (previousDir === undefined) delete process.env.OWNER_AUDIT_BACKUP_DIR;
    else process.env.OWNER_AUDIT_BACKUP_DIR = previousDir;
  });

  it("builds an English business record for official review", async () => {
    recordOwnerCommandEvent({
      kind: "incident",
      severity: "high",
      sourceAiId: "platform-security-ai",
      english: "Security AI isolated commerce after a probe.",
    });
    const archive = await buildOwnerComplianceArchive("test");
    expect(archive.llc).toBe("UR Platform LLC");
    expect(archive.notice).toMatch(/not a tax return/i);
    expect(archive.commandCenterEvents.length).toBeGreaterThan(0);
    expect(archive.counts.commandCenterEvents).toBeGreaterThan(0);
  });

  it("writes a JSON file when a backup folder is set", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ur-ops-audit-"));
    process.env.OWNER_AUDIT_BACKUP_DIR = dir;
    const meta = await writeOwnerComplianceSnapshot("test_write");
    expect(meta.fileName).toMatch(/ur-ops-archive-/);
    const raw = await readFile(path.join(dir, meta.fileName!), "utf8");
    const parsed = JSON.parse(raw) as { llc: string };
    expect(parsed.llc).toBe("UR Platform LLC");
  });
});

describe("owner emergency state", () => {
  beforeEach(() => {
    _resetOpsStateForTests();
    _resetPlatformSectionsForTests();
    _resetSandboxRepairsForTests();
    _resetOwnerCommandCenterForTests();
  });

  it("is quiet when nothing is on fire", () => {
    const state = getOwnerEmergencyState(true);
    expect(state.active).toBe(false);
    expect(state.phoneAlarmArmed).toBe(true);
  });

  it("flags an open high-severity isolated incident", async () => {
    await createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "high",
      category: "security",
      title: "Commerce probes",
      problem: "Repeated unauthorized probes on checkout.",
      proposedFix: "Keep commerce isolated until reviewed.",
      affectedSectionId: "commerce",
    });
    const state = getOwnerEmergencyState(false);
    expect(state.active).toBe(true);
    expect(state.title).toMatch(/Commerce/);
    expect(state.english).toMatch(/EMERGENCY/);
  });
});
