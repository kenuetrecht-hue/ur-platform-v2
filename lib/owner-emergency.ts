/** Owner fire-alarm rules — wake the phone only for real site emergencies. */

export function shouldWakeOwner(input: {
  severity?: string;
  autoIsolated?: boolean;
  category?: string;
}): boolean {
  if (input.autoIsolated) return true;
  if (input.severity === "critical" || input.severity === "high") return true;
  if (input.category === "malware" || input.category === "security") return true;
  return false;
}

export const OWNER_EMERGENCY_CHANNEL_ID = "owner-emergency";

export const OWNER_EMERGENCY_CHANNEL_NAME = "Owner emergency — website / app";
