/**
 * Owner-visible sandbox repair plan. Never applied to the live site until I APPROVE.
 */

import type { RemediationActionId } from "./platform-ops-remediation-types";

export const OPS_SANDBOX_STATUSES = ["running", "passed", "failed", "needs_owner"] as const;
export type OpsSandboxStatus = (typeof OPS_SANDBOX_STATUSES)[number];

export type OpsSandboxCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

export type OpsSandboxRepair = {
  id: string;
  incidentId: string;
  title: string;
  status: OpsSandboxStatus;
  /** Plain English diagnosis for the owner. */
  diagnosis: string;
  planSteps: string[];
  liveActions: RemediationActionId[];
  checks: OpsSandboxCheck[];
  /** What would change on the live site after I APPROVE. */
  wouldTouchLive: string[];
  appliedLive: boolean;
  createdAt: string;
};
