/**
 * Owner emergency snapshot — what the phone alarm and Command Center should show.
 */

import { shouldWakeOwner } from "../../lib/owner-emergency";
import { listOpsIncidents } from "./platform-ops-service";

export type OwnerEmergencyState = {
  active: boolean;
  severity: string | null;
  title: string | null;
  problem: string | null;
  incidentId: string | null;
  createdAt: string | null;
  english: string;
  phoneAlarmArmed: boolean;
};

export function getOwnerEmergencyState(phoneAlarmArmed: boolean): OwnerEmergencyState {
  const open = listOpsIncidents().filter(
    (i) =>
      i.status !== "resolved" &&
      i.status !== "rejected" &&
      i.status !== "deploy_executed" &&
      shouldWakeOwner({
        severity: i.severity,
        autoIsolated: i.autoIsolated,
        category: i.category,
      }),
  );
  const top = open[0];
  if (!top) {
    return {
      active: false,
      severity: null,
      title: null,
      problem: null,
      incidentId: null,
      createdAt: null,
      english: "No website or app emergency right now.",
      phoneAlarmArmed,
    };
  }
  return {
    active: true,
    severity: top.severity,
    title: top.title,
    problem: top.problem,
    incidentId: top.id,
    createdAt: top.createdAt,
    english: `EMERGENCY: ${top.title}. ${top.problem} Open Command Center, review the sandbox plan, and type I APPROVE only if you want the live fix.`,
    phoneAlarmArmed,
  };
}
