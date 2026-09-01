import type { PlatformSectionId } from "./platform-section-flags";
import type { OpsDeployProposal } from "./platform-ops-remediation-types";

/** Map API namespace circuit trips to a user-facing platform section. */
export function apiNamespaceToSection(namespace: string): PlatformSectionId | null {
  switch (namespace) {
    case "aiCreators":
    case "chat":
    case "aiLanguage":
    case "ai":
    case "webSearch":
    case "voiceProperty":
    case "ai3dSpecialist":
    case "aiRealEstate":
      return "ai_chat";
    case "loyalty":
    case "stamps":
      return "loyalty";
    case "auth":
      return "landing_demo";
    case "jobsite":
      return "jobsite";
    case "video":
    case "commerce":
      return "commerce";
    default:
      return null;
  }
}

export function buildDefaultDeployProposal(input: {
  proposedFix: string;
  category: string;
  apiNamespace?: string;
  reopenAfterFix?: boolean;
}): OpsDeployProposal {
  const steps = input.proposedFix
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  const recommendedActions: OpsDeployProposal["recommendedActions"] = ["mark_deploy_ready"];

  if (input.apiNamespace) {
    recommendedActions.unshift("reset_api_circuit");
  }
  if (/migration|database|mysql|table|schema|drizzle/i.test(input.proposedFix)) {
    recommendedActions.unshift("run_db_migrations");
  }
  if (input.reopenAfterFix) {
    recommendedActions.push("reopen_section");
  }
  recommendedActions.push("rerun_health_scan");

  return {
    summary: input.proposedFix.slice(0, 300),
    steps: steps.length ? steps : [input.proposedFix.slice(0, 300)],
    recommendedActions: [...new Set(recommendedActions)],
    apiNamespace: input.apiNamespace,
  };
}
