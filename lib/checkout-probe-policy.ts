/** Unauthorized checkout probing — block scanners without taking the whole site down. */

export const CHECKOUT_PROBE_WINDOW_MS = 10 * 60 * 1000;
export const CHECKOUT_PROBE_BLOCK_AFTER = 5;

export const CHECKOUT_PROBE_INCIDENT_TITLE = "Commerce probes";
export const CHECKOUT_PROBE_INCIDENT_PROBLEM = "Repeated unauthorized probes on checkout.";
export const CHECKOUT_PROBE_INCIDENT_FIX =
  "The probing network is blocked. Keep commerce isolated until you review Owner Ops, then type I APPROVE to reopen.";

/** This machine / browser talking to localhost — not an outside scanner. */
export function isTrustedLocalCheckoutIp(ip: string): boolean {
  const raw = ip.trim().toLowerCase();
  if (!raw || raw === "unknown" || raw === "localhost") return true;
  const v4 = raw.startsWith("::ffff:") ? raw.slice(7) : raw;
  if (raw === "::1" || v4 === "::1") return true;
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4);
}

export function isPrivateLanIp(ip: string): boolean {
  const raw = ip.trim().toLowerCase();
  const v4 = raw.startsWith("::ffff:") ? raw.slice(7) : raw;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v4)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(v4)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(v4);
}
