/** Owner-approved remediation actions — no arbitrary shell commands. */

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
