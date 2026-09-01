import { describe, expect, it, beforeEach } from "vitest";
import { OWNER_REMEDIATION_CONFIRM_PHRASE } from "../lib/platform-ops-remediation-types";
import {
  createOpsIncident,
  executeIncidentRemediation,
  recordOwnerReopenedSection,
  _resetOpsStateForTests,
} from "../server/_core/platform-ops-service";
import {
  getPlatformSectionState,
  _resetPlatformSectionsForTests,
} from "../server/_core/platform-section-flags-service";
import {
  getSandboxRepair,
  runOpsSandboxRepair,
  _resetSandboxRepairsForTests,
} from "../server/_core/ops-sandbox-repair-service";
import { resetNamespaceCircuit, getNamespaceCircuitStatus } from "../server/_core/api-security";
import { _resetOwnerCommandCenterForTests, listOwnerCommandEvents } from "../server/_core/owner-command-center-service";

describe("ops sandbox repair", () => {
  beforeEach(() => {
    _resetOpsStateForTests();
    _resetPlatformSectionsForTests();
    _resetSandboxRepairsForTests();
    _resetOwnerCommandCenterForTests();
    resetNamespaceCircuit("chat");
  });

  it("diagnoses a fix without touching the live website", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-doctor-ai",
      severity: "medium",
      category: "bug",
      title: "Chat hiccup",
      problem: "Members report a timeout on specialist chat.",
      proposedFix: "Reset the chat circuit if it is open, then mark deploy ready.",
      affectedSectionId: "ai_chat",
      sectionAction: "reopen",
      deployProposal: {
        summary: "Reset chat circuit after review",
        steps: ["Inspect circuit", "Reset chat circuit", "Mark deploy ready"],
        recommendedActions: ["reset_api_circuit", "mark_deploy_ready"],
        apiNamespace: "chat",
      },
    });

    const sandbox = getSandboxRepair(incident.id);
    expect(sandbox).toBeDefined();
    expect(sandbox?.appliedLive).toBe(false);
    expect(sandbox?.liveActions).toContain("reset_api_circuit");
    expect(getPlatformSectionState("ai_chat").enabled).toBe(true);
    expect(getNamespaceCircuitStatus("chat").isOpen).toBe(false);

    const events = listOwnerCommandEvents({ kind: "sandbox_repair" });
    expect(events[0]?.english).toMatch(/live website|I APPROVE/i);
  });

  it("does not apply live remediations until the owner types I APPROVE", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "high",
      category: "bug",
      title: "Circuit open on chat",
      problem: "Chat namespace circuit breaker is open.",
      proposedFix: "Reset chat circuit and mark deploy ready.",
      affectedSectionId: "ai_chat",
      deployProposal: {
        summary: "Reset circuit",
        steps: ["Reset chat circuit"],
        recommendedActions: ["reset_api_circuit", "mark_deploy_ready"],
        apiNamespace: "chat",
      },
    });

    await expect(executeIncidentRemediation(incident.id, "go")).rejects.toThrow(/I APPROVE/);
    expect(getSandboxRepair(incident.id)?.appliedLive).toBe(false);

    const updated = await executeIncidentRemediation(
      incident.id,
      "Approved",
      OWNER_REMEDIATION_CONFIRM_PHRASE,
    );
    expect(updated.status).toBe("deploy_executed");
    expect(getSandboxRepair(incident.id)?.appliedLive).toBe(true);
  });

  it("never runs unknown live actions from the sandbox", () => {
    const repair = runOpsSandboxRepair({
      incident: {
        id: "inc-sandbox-1",
        title: "Fake deploy",
        problem: "Someone asked to rewrite production files.",
        proposedFix: "Do not touch the repo.",
        category: "security",
        severity: "high",
        status: "awaiting_owner_approval",
        deployProposal: {
          summary: "Safe record only",
          steps: ["Record the plan"],
          recommendedActions: ["mark_deploy_ready"],
        },
      },
      healthFindings: [],
    });
    expect(repair.liveActions).toEqual(["mark_deploy_ready"]);
    expect(repair.checks.some((c) => c.name === "No live mutation in sandbox" && c.passed)).toBe(true);
  });

  it("records a manual section reopen on the incident", async () => {
    const incident = await createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "high",
      category: "security",
      title: "Suspicious probe",
      problem: "Repeated unauthorized probes on commerce.",
      proposedFix: "Keep commerce isolated until reviewed.",
      affectedSectionId: "commerce",
    });
    expect(getPlatformSectionState("commerce").enabled).toBe(false);

    const updated = recordOwnerReopenedSection(incident.id, "Reopen after review");
    expect(getPlatformSectionState("commerce").enabled).toBe(true);
    expect(updated.actionsTaken.join(" ")).toMatch(/reopened section/i);
  });
});
