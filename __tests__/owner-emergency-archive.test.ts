import { mkdtemp, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shouldWakeOwner } from "../lib/owner-emergency";
import { isOwnerProtectionScanRequest } from "../lib/owner-audit-clearance";
import { scanSourceForTamper } from "../lib/owner-tamper-scan";
import {
  buildOwnerComplianceArchive,
  writeOwnerComplianceSnapshot,
} from "../server/_core/owner-compliance-archive-service";
import { recordOwnerCommandEvent, _resetOwnerCommandCenterForTests } from "../server/_core/owner-command-center-service";
import { isOwnerAuditClearanceRequest } from "../lib/owner-audit-clearance";
import { getOwnerEmergencyState } from "../server/_core/owner-emergency-service";
import {
  closeOwnerAuditClearanceIncidents,
  closeQuietOpsIncidents,
  createOpsIncident,
  runPlatformHealthScan,
  inferIncidentFromOpsChat,
  _resetOpsStateForTests,
} from "../server/_core/platform-ops-service";
import {
  getPlatformSectionState,
  _resetPlatformSectionsForTests,
} from "../server/_core/platform-section-flags-service";
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
    expect(shouldWakeOwner({ severity: "high", category: "config" })).toBe(false);
    expect(shouldWakeOwner({ severity: "high", category: "compliance" })).toBe(false);
    expect(shouldWakeOwner({ severity: "high", category: "config", autoIsolated: true })).toBe(false);
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

  it("does not raise the red banner for an owner code-review request", async () => {
    const userMessage =
      "Run a deep dive and make sure there are no backdoors. Also remove the red alert banner.";
    const aiReply = [
      "INCIDENT SUMMARY: codebase security audit for backdoor and platform alert banner clearance request",
      "PROBLEM: user requested a full security scan for backdoors and removal of the active operational red alert banner",
      "PROPOSED FIX: Complete automated static analysis on all tRPC routes and auth middleware.",
      "STATUS: awaiting_owner_approval",
    ].join("\n");

    expect(isOwnerAuditClearanceRequest(`${userMessage}\n${aiReply}`)).toBe(true);
    expect(inferIncidentFromOpsChat("platform-security-ai", userMessage, aiReply)).toBeNull();

    const incident = await createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "high",
      category: "security",
      title: "codebase security audit for backdoor and platform alert banner clearance request",
      problem:
        "user requested a full security scan for backdoors and removal of the active operational red alert banner",
      proposedFix: "Complete automated static analysis on all tRPC routes and auth middleware.",
      affectedSectionId: "ai_chat",
    });

    expect(getOwnerEmergencyState(true).active).toBe(false);
    expect(getPlatformSectionState("ai_chat").enabled).toBe(false);

    expect(closeOwnerAuditClearanceIncidents()).toBe(1);
    expect(incident.status).toBe("resolved");
    expect(getPlatformSectionState("ai_chat").enabled).toBe(true);
    expect(getOwnerEmergencyState(true).active).toBe(false);
  });

  it("still flags a real unauthorized-access report", () => {
    const filed = inferIncidentFromOpsChat(
      "platform-security-ai",
      "Checkout is being probed.",
      "INCIDENT SUMMARY: Unauthorized access found on checkout\nPROBLEM: Repeated unauthorized access confirmed on commerce.\nPROPOSED FIX: Keep commerce isolated.\nSTATUS: awaiting_owner_approval",
    );
    expect(filed?.shouldFile).toBe(true);
    expect(filed?.category).toBe("malware");
  });

  it("keeps the red banner down for a missing setup key", async () => {
    await createOpsIncident({
      sourceAi: "platform-doctor-ai",
      severity: "high",
      category: "config",
      title: "Gemini AI not configured",
      problem: "CONTENTMATE_GEMINI_API_KEY is missing.",
      proposedFix: "Add the key in Railway.",
      affectedSectionId: "ai_chat",
    });
    expect(getPlatformSectionState("ai_chat").enabled).toBe(true);
    expect(getOwnerEmergencyState(true).active).toBe(false);
  });

  it("closes an old setup alarm and reopens the section it shut off", async () => {
    await createOpsIncident({
      sourceAi: "platform-doctor-ai",
      severity: "high",
      category: "config",
      title: "Gemini AI not configured",
      problem: "CONTENTMATE_GEMINI_API_KEY is missing.",
      proposedFix: "Add the key in Railway.",
      affectedSectionId: "ai_chat",
      autoIsolateSection: true,
    });
    expect(getPlatformSectionState("ai_chat").enabled).toBe(false);
    expect(closeQuietOpsIncidents()).toBe(1);
    expect(getPlatformSectionState("ai_chat").enabled).toBe(true);
    expect(getOwnerEmergencyState(true).active).toBe(false);
  });

  it("runs a code scan without raising the banner when nothing is planted", async () => {
    expect(isOwnerProtectionScanRequest("Please scan the website and the code for anyone who tapped in")).toBe(
      true,
    );
    const planted = scanSourceForTamper([
      { path: "server/routers/evil.ts", text: "function door(){ eval(userText) }" },
      { path: "server/_core/coder-sandbox-execution.ts", text: 'if (file.content.includes("eval(")) {}' },
    ]);
    expect(planted).toHaveLength(1);
    expect(planted[0]?.path).toBe("server/routers/evil.ts");

    const scan = await runPlatformHealthScan();
    expect(scan.summary).toMatch(/red banner stays off/i);
    expect(getOwnerEmergencyState(true).active).toBe(false);
  });
});
