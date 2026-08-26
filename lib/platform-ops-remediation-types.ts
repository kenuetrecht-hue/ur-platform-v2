/** Owner-approved remediation actions — no arbitrary shell commands. */

/** Owner must type this exactly in Owner Ops before any fix is finalized. */
export const OWNER_REMEDIATION_CONFIRM_PHRASE = "I APPROVE" as const;

export function isOwnerRemediationConfirmed(phrase: string | undefined): boolean {
  return phrase?.trim() === OWNER_REMEDIATION_CONFIRM_PHRASE;
}

export const REMEDIATION_ACTION_IDS = [
  "reset_api_circuit",
  "rerun_health_scan",
  "run_db_migrations",
  "reopen_section",
  "mark_deploy_ready",
] as const;

export type RemediationActionId = (typeof REMEDIATION_ACTION_IDS)[number];

export type OpsDeployProposal = {
  summary: string;
  steps: string[];
  /** Allowlisted remediation keys the AI recommends after owner OK. */
  recommendedActions: RemediationActionId[];
  /** Optional API namespace when reset_api_circuit applies. */
  apiNamespace?: string;
};

export type RemediationExecutionResult = {
  actionId: RemediationActionId;
  success: boolean;
  message: string;
};
