/**
 * Owner-approved remediation runner — allowlisted fixes only.
 * Deploy/upgrade never runs without explicit owner approval on the incident.
 */

import { execSync } from "child_process";
import type { ApiNamespace } from "./api-security";
import { resetNamespaceCircuit } from "./api-security";
import type {
  OpsDeployProposal,
  RemediationActionId,
  RemediationExecutionResult,
} from "../../lib/platform-ops-remediation-types";
import type { PlatformSectionId } from "../../lib/platform-section-flags";
import { enablePlatformSection } from "./platform-section-flags-service";

const API_NAMESPACES: ApiNamespace[] = [
  "chat",
  "aiCreators",
  "aiLanguage",
  "webSearch",
  "loyalty",
  "ai",
  "stamps",
  "voiceProperty",
  "ai3dSpecialist",
  "aiRealEstate",
  "auth",
  "system",
];

function isApiNamespace(value: string): value is ApiNamespace {
  return (API_NAMESPACES as readonly string[]).includes(value);
}

export function sanitizeDeployProposal(raw: OpsDeployProposal): OpsDeployProposal {
  const recommendedActions = raw.recommendedActions.filter((a) =>
    (["reset_api_circuit", "rerun_health_scan", "run_db_migrations", "reopen_section", "mark_deploy_ready"] as const).includes(
      a,
    ),
  );

  return {
    summary: raw.summary.slice(0, 500),
    steps: raw.steps.slice(0, 12).map((s) => s.slice(0, 400)),
    recommendedActions: recommendedActions.length ? recommendedActions : ["mark_deploy_ready"],
    apiNamespace:
      raw.apiNamespace && isApiNamespace(raw.apiNamespace) ? raw.apiNamespace : undefined,
  };
}

export async function executeApprovedRemediation(params: {
  incidentId: string;
  proposal: OpsDeployProposal;
  affectedSectionId?: PlatformSectionId;
  ownerNote?: string;
  onRerunHealthScan?: () => Promise<string>;
}): Promise<RemediationExecutionResult[]> {
  const results: RemediationExecutionResult[] = [];
  const proposal = sanitizeDeployProposal(params.proposal);

  for (const actionId of proposal.recommendedActions) {
    results.push(await runRemediationAction(actionId, params));
  }

  return results;
}

async function runRemediationAction(
  actionId: RemediationActionId,
  params: {
    incidentId: string;
    proposal: OpsDeployProposal;
    affectedSectionId?: PlatformSectionId;
    ownerNote?: string;
    onRerunHealthScan?: () => Promise<string>;
  },
): Promise<RemediationExecutionResult> {
  try {
    switch (actionId) {
      case "reset_api_circuit": {
        const ns = params.proposal.apiNamespace;
        if (!ns || !isApiNamespace(ns)) {
          return {
            actionId,
            success: false,
            message: "No valid API namespace specified for circuit reset.",
          };
        }
        resetNamespaceCircuit(ns);
        return {
          actionId,
          success: true,
          message: `Reset circuit breaker for namespace "${ns}".`,
        };
      }
      case "rerun_health_scan": {
        if (!params.onRerunHealthScan) {
          return {
            actionId,
            success: false,
            message: "Health scan handler not configured.",
          };
        }
        const summary = await params.onRerunHealthScan();
        return { actionId, success: true, message: summary };
      }
      case "run_db_migrations": {
        execSync("node scripts/run-all-migrations.js", {
          stdio: "pipe",
          cwd: process.cwd(),
          timeout: 120_000,
        });
        return {
          actionId,
          success: true,
          message: "Database migrations completed successfully.",
        };
      }
      case "reopen_section": {
        if (!params.affectedSectionId) {
          return {
            actionId,
            success: false,
            message: "No affected section on this incident to reopen.",
          };
        }
        enablePlatformSection({
          sectionId: params.affectedSectionId,
          ownerNote: params.ownerNote ?? "Owner approved reopen after remediation",
        });
        return {
          actionId,
          success: true,
          message: `Section "${params.affectedSectionId}" reopened.`,
        };
      }
      case "mark_deploy_ready":
        return {
          actionId,
          success: true,
          message:
            "Deploy package approved and recorded. Push your branch or run your CI deploy pipeline when ready — no automatic production deploy without your hosting pipeline.",
        };
      default:
        return { actionId, success: false, message: "Unknown remediation action." };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message.slice(0, 200) : "Remediation failed";
    return { actionId, success: false, message: msg };
  }
}
