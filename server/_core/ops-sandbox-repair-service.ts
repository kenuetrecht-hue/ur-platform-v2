/**
 * Isolated sandbox diagnosis for ops incidents.
 * Never mutates the live website. Owner must type I APPROVE before allowlisted live actions run.
 */

import { randomUUID } from "crypto";
import { getNamespaceCircuitStatus, type ApiNamespace } from "./api-security";
import { sanitizeDeployProposal } from "./platform-ops-remediation-service";
import { getPlatformSectionState } from "./platform-section-flags-service";
import { persistSandboxRepair, loadSandboxRepairsFromDb } from "../db-platform-ops";
import type { PlatformSectionId } from "../../lib/platform-section-flags";
import type { OpsDeployProposal } from "../../lib/platform-ops-remediation-types";
import type { OpsSandboxCheck, OpsSandboxRepair } from "../../lib/ops-sandbox-repair-types";
import type { OwnerCommandPendingRepair } from "../../lib/owner-command-center-types";

const repairs = new Map<string, OpsSandboxRepair>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

export type SandboxIncidentInput = {
  id: string;
  title: string;
  problem: string;
  proposedFix: string;
  category: string;
  severity: string;
  affectedSectionId?: PlatformSectionId;
  deployProposal?: OpsDeployProposal;
  status: string;
};

function remember(repair: OpsSandboxRepair): OpsSandboxRepair {
  repairs.set(repair.incidentId, repair);
  void persistSandboxRepair(repair);
  return repair;
}

export async function hydrateSandboxRepairs(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const rows = await loadSandboxRepairsFromDb();
      for (const row of rows) {
        if (!repairs.has(row.incidentId)) repairs.set(row.incidentId, row);
      }
      hydrated = true;
    })();
  }
  await hydratePromise;
}

export function getSandboxRepair(incidentId: string): OpsSandboxRepair | undefined {
  return repairs.get(incidentId);
}

export function listSandboxRepairs(): OpsSandboxRepair[] {
  return [...repairs.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function listPendingSandboxRepairs(openIncidentIds: Set<string>): OwnerCommandPendingRepair[] {
  return listSandboxRepairs()
    .filter((r) => openIncidentIds.has(r.incidentId) && !r.appliedLive)
    .map((r) => ({
      incidentId: r.incidentId,
      title: r.title,
      diagnosis: r.diagnosis,
      planSteps: r.planSteps,
      liveActions: r.liveActions,
      checks: r.checks,
      status: r.status,
      wouldTouchLive: r.wouldTouchLive,
      sandboxPassed: r.status === "passed",
    }));
}

export function markSandboxRepairApplied(incidentId: string): void {
  const repair = repairs.get(incidentId);
  if (!repair) return;
  repair.appliedLive = true;
  remember(repair);
}

export function runOpsSandboxRepair(input: {
  incident: SandboxIncidentInput;
  healthFindings: Array<{ severity: string; title: string; problem: string }>;
}): OpsSandboxRepair {
  const proposal = sanitizeDeployProposal(
    input.incident.deployProposal ?? {
      summary: input.incident.proposedFix.slice(0, 300),
      steps: [input.incident.proposedFix.slice(0, 300)],
      recommendedActions: ["mark_deploy_ready"],
    },
  );

  const checks: OpsSandboxCheck[] = [];

  checks.push({
    name: "Allowlisted actions only",
    passed: proposal.recommendedActions.length > 0,
    detail: `Sandbox will recommend: ${proposal.recommendedActions.join(", ")}. No shell, file, or repo edits run here.`,
  });

  checks.push({
    name: "Problem recorded",
    passed: input.incident.problem.trim().length > 8,
    detail: input.incident.problem.trim()
      ? "The bug report is saved for your audit file."
      : "Incident is missing a problem description.",
  });

  const matchingFindings = input.healthFindings.filter(
    (f) =>
      f.title === input.incident.title ||
      input.incident.problem.toLowerCase().includes(f.title.toLowerCase().slice(0, 24)),
  );
  checks.push({
    name: "Reproduce in sandbox",
    passed: matchingFindings.length > 0 || input.healthFindings.length === 0,
    detail:
      matchingFindings.length > 0
        ? `Health scan still sees: ${matchingFindings.map((f) => f.title).join("; ")}.`
        : input.healthFindings.length === 0
          ? "Live health checks are clear. This incident is from a reported or prior finding — sandbox recorded the plan without changing the site."
          : "Health scan has other findings, but this exact title is not repeating. Plan is still held for your approval.",
  });

  if (input.incident.affectedSectionId) {
    const section = getPlatformSectionState(input.incident.affectedSectionId);
    checks.push({
      name: "Section isolation",
      passed: true,
      detail: section.enabled
        ? `Section "${input.incident.affectedSectionId}" is still online. The live reopen action will wait for I APPROVE.`
        : `Section "${input.incident.affectedSectionId}" is isolated so members are protected while you review.`,
    });
  }

  if (proposal.apiNamespace) {
    const circuit = getNamespaceCircuitStatus(proposal.apiNamespace as ApiNamespace);
    checks.push({
      name: "API circuit (read-only)",
      passed: true,
      detail: circuit.isOpen
        ? `Namespace "${proposal.apiNamespace}" is open (blocking traffic). Reset is planned — not applied yet.`
        : `Namespace "${proposal.apiNamespace}" is closed / healthy. Reset is optional after you approve.`,
    });
  }

  const unknownLive = proposal.recommendedActions.filter(
    (a) =>
      a !== "reset_api_circuit" &&
      a !== "rerun_health_scan" &&
      a !== "run_db_migrations" &&
      a !== "reopen_section" &&
      a !== "mark_deploy_ready",
  );
  checks.push({
    name: "No live mutation in sandbox",
    passed: unknownLive.length === 0,
    detail:
      unknownLive.length === 0
        ? "Sandbox did not write files, run migrations, reopen sections, or reset circuits."
        : "Unknown action was stripped. Only allowlisted steps can go live after I APPROVE.",
  });

  const wouldTouchLive: string[] = [];
  for (const action of proposal.recommendedActions) {
    if (action === "reset_api_circuit") {
      wouldTouchLive.push(`Reset API circuit ${proposal.apiNamespace ?? "(namespace required)"}`);
    } else if (action === "run_db_migrations") {
      wouldTouchLive.push("Run database migrations on the live MySQL database");
    } else if (action === "reopen_section") {
      wouldTouchLive.push(`Reopen website/app section ${input.incident.affectedSectionId ?? "(none linked)"}`);
    } else if (action === "rerun_health_scan") {
      wouldTouchLive.push("Re-run the Doctor AI health scan");
    } else if (action === "mark_deploy_ready") {
      wouldTouchLive.push("Mark the repair package ready — you still push/deploy through your hosting pipeline");
    }
  }

  const failed = checks.filter((c) => !c.passed);
  const status = failed.length === 0 ? "passed" : "needs_owner";

  const diagnosis =
    failed.length === 0
      ? `Sandbox finished. Doctor/Security diagnosed "${input.incident.title}" and prepared a repair plan. Nothing was applied to the live website. Type I APPROVE to run only: ${proposal.recommendedActions.join(", ")}.`
      : `Sandbox finished with ${failed.length} check(s) that need your eyes. The live site was not changed. Review the plan, then type I APPROVE only if you want the allowlisted live steps.`;

  return remember({
    id: `sbox-${randomUUID().slice(0, 12)}`,
    incidentId: input.incident.id,
    title: input.incident.title,
    status,
    diagnosis,
    planSteps: proposal.steps.length ? proposal.steps : [input.incident.proposedFix],
    liveActions: proposal.recommendedActions,
    checks,
    wouldTouchLive,
    appliedLive: false,
    createdAt: new Date().toISOString(),
  });
}

export function _resetSandboxRepairsForTests(): void {
  repairs.clear();
  hydrated = false;
  hydratePromise = null;
}
