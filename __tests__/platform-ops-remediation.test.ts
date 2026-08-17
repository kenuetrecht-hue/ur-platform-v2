import { describe, expect, it, beforeEach } from "vitest";
import {
  createOpsIncident,
  executeIncidentRemediation,
  _resetOpsStateForTests,
} from "../server/_core/platform-ops-service";
import { _resetPlatformSectionsForTests, getPlatformSectionState } from "../server/_core/platform-section-flags-service";

describe("platform ops auto-isolate", () => {
  beforeEach(() => {
    _resetOpsStateForTests();
    _resetPlatformSectionsForTests();
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

    const updated = await executeIncidentRemediation(incident.id, "Approved");

    expect(updated.status).toBe("deploy_executed");
    expect(updated.remediationResults?.some((r) => r.actionId === "reset_api_circuit" && r.success)).toBe(true);
    expect(updated.remediationResults?.some((r) => r.actionId === "mark_deploy_ready" && r.success)).toBe(true);
  });
});
