/** Owner fire-alarm rules — wake the phone only for real site emergencies. */

/**
 * Missing keys and setup notes are not an attack. They stay in Command Center
 * and do not turn on the red banner.
 */
export function isQuietOpsCategory(category?: string, severity?: string): boolean {
  if (category === "config" || category === "monitoring" || category === "performance") return true;
  if (category === "compliance" && severity !== "critical") return true;
  return false;
}

export function shouldWakeOwner(input: {
  severity?: string;
  autoIsolated?: boolean;
  category?: string;
}): boolean {
  if (isQuietOpsCategory(input.category, input.severity)) return false;
  if (input.category === "malware" || input.category === "security") return true;
  if (input.severity === "critical") return true;
  if (input.autoIsolated) return true;
  if (input.severity === "high") return true;
  return false;
}

export const OWNER_EMERGENCY_CHANNEL_ID = "owner-emergency";

export const OWNER_EMERGENCY_CHANNEL_NAME = "Owner emergency — website / app";
