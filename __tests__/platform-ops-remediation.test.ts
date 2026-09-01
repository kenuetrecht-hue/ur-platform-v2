import { describe, expect, it, beforeEach } from "vitest";
import {
  OWNER_REMEDIATION_CONFIRM_PHRASE,
  isOwnerRemediationConfirmed,
} from "../lib/platform-ops-remediation-types";
import {
  createOpsIncident,
  executeIncidentRemediation,
  shouldAutoIsolateIncident,
  _resetOpsStateForTests,
} from "../server/_core/platform-ops-service";
import { _resetPlatformSectionsForTests, getPlatformSectionState } from "../server/_core/platform-section-flags-service";
import { _resetSandboxRepairsForTests, getSandboxRepair } from "../server/_core/ops-sandbox-repair-service";
import { _resetOwnerCommandCenterForTests } from "../server/_core/owner-command-center-service";

describe("owner remediation confirmation", () => {
  it("accepts only the exact owner phrase", () => {
    expect(isOwnerRemediationConfirmed(OWNER_REMEDIATION_CONFIRM_PHRASE)).toBe(true);
    expect(isOwnerRemediationConfirmed(" I APPROVE ")).toBe(true);
    expect(isOwnerRemediationConfirmed("i approve")).toBe(false);
    expect(isOwnerRemediationConfirmed("Approved")).toBe(false);
    expect(isOwnerRemediationConfirmed(undefined)).toBe(false);
  });
});

describe("platform ops auto-isolate", () => {
  beforeEach(() => {
    _resetOpsStateForTests();
    _resetPlatformSectionsForTests();
    _resetSandboxRepairsForTests();
    _resetOwnerCommandCenterForTests();
  });

  it("auto-isolates section and notifies on high severity bug", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-doctor-ai",
      severity: "high",
      category: "bug",
      title: "AI chat errors",
      problem: "Users cannot send messages in specialist chat.",
      proposedFix: "Reset API circuit and verify Gemini key.",
      affectedSectionId: "ai_chat",
      sectionAction: "isolate",
    });

    expect(incident.autoIsolated).toBe(true);
    expect(incident.status).toBe("section_isolated");
    expect(getPlatformSectionState("ai_chat").enabled).toBe(false);
    expect(incident.deployProposal?.recommendedActions.length).toBeGreaterThan(0);
    expect(incident.sandboxRepair?.appliedLive).toBe(false);
    expect(getSandboxRepair(incident.id)?.wouldTouchLive.length).toBeGreaterThan(0);
  });

  it("does not auto-isolate when sectionAction is reopen", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-doctor-ai",
      severity: "medium",
      category: "bug",
      title: "Reopen AI chat",
      problem: "Fix verified.",
      proposedFix: "Reopen ai_chat section.",
      affectedSectionId: "ai_chat",
      sectionAction: "reopen",
    });

    expect(incident.autoIsolated).toBeFalsy();
    expect(getPlatformSectionState("ai_chat").enabled).toBe(true);
  });

  it("runs allowlisted remediation only after owner approval", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-doctor-ai",
      severity: "high",
      category: "bug",
      title: "Circuit open on chat",
      problem: "Chat namespace circuit breaker is open.",
      proposedFix: "Reset chat circuit and mark deploy ready.",
      affectedSectionId: "ai_chat",
      deployProposal: {
        summary: "Reset circuit",
        steps: ["Reset chat circuit", "Mark deploy ready"],
        recommendedActions: ["reset_api_circuit", "mark_deploy_ready"],
        apiNamespace: "chat",
      },
    });

    await expect(executeIncidentRemediation(incident.id, "Approved")).rejects.toThrow(
      /I APPROVE/,
    );

    const updated = await executeIncidentRemediation(
      incident.id,
      "Approved",
      OWNER_REMEDIATION_CONFIRM_PHRASE,
    );

    expect(updated.status).toBe("deploy_executed");
    expect(updated.remediationResults?.some((r) => r.actionId === "reset_api_circuit" && r.success)).toBe(true);
    expect(updated.remediationResults?.some((r) => r.actionId === "mark_deploy_ready" && r.success)).toBe(true);
  });

  it("auto-isolates security and malware even at low severity", async () => {
    expect(
      shouldAutoIsolateIncident({
        affectedSectionId: "ai_chat",
        severity: "low",
        category: "security",
      }),
    ).toBe(true);

    const incident = await createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "low",
      category: "malware",
      title: "Suspicious upload pattern",
      problem: "Repeated unauthorized file probes on commerce.",
      proposedFix: "Keep commerce isolated until owner reviews logs.",
      affectedSectionId: "commerce",
    });

    expect(incident.autoIsolated).toBe(true);
    expect(getPlatformSectionState("commerce").enabled).toBe(false);
  });

  it("does not isolate when staff filing disables auto-isolate", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "high",
      category: "security",
      title: "Staff report only",
      problem: "Possible auth anomaly.",
      proposedFix: "Owner should review before taking chat offline.",
      affectedSectionId: "ai_chat",
      autoIsolateSection: false,
    });

    expect(incident.autoIsolated).toBeFalsy();
    expect(getPlatformSectionState("ai_chat").enabled).toBe(true);
    expect(incident.status).toBe("awaiting_owner_approval");
  });
});
