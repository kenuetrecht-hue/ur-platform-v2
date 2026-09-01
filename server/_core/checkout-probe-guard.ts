/**
 * Detect repeated unauthenticated checkout hits, block the source, alert Security AI.
 */

import { ENV } from "./env";
import { blockIp } from "./api-security";
import { createOpsIncident } from "./platform-ops-service";
import {
  CHECKOUT_PROBE_BLOCK_AFTER,
  CHECKOUT_PROBE_INCIDENT_FIX,
  CHECKOUT_PROBE_INCIDENT_PROBLEM,
  CHECKOUT_PROBE_INCIDENT_TITLE,
  CHECKOUT_PROBE_WINDOW_MS,
  isPrivateLanIp,
  isTrustedLocalCheckoutIp,
} from "../../lib/checkout-probe-policy";

type ProbeBucket = {
  count: number;
  windowStartMs: number;
};

const probesByIp = new Map<string, ProbeBucket>();
let incidentFiledInWindow = false;
let incidentWindowStartMs = 0;

function isLoopback(ip: string): boolean {
  return isTrustedLocalCheckoutIp(ip) || (!ENV.isProduction && isPrivateLanIp(ip));
}

function maskIp(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return "unknown";
  if (trimmed.includes(":")) return "ipv6";
  const parts = trimmed.split(".");
  if (parts.length !== 4) return "unknown";
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}

export function noteUnauthorizedCheckoutProbe(ip: string): { blocked: boolean; count: number } {
  const now = Date.now();
  const key = (ip || "unknown").trim() || "unknown";
  let bucket = probesByIp.get(key);
  if (!bucket || now - bucket.windowStartMs >= CHECKOUT_PROBE_WINDOW_MS) {
    bucket = { count: 0, windowStartMs: now };
    probesByIp.set(key, bucket);
  }
  bucket.count += 1;

  if (isLoopback(key)) {
    return { blocked: false, count: bucket.count };
  }

  const blocked = bucket.count >= CHECKOUT_PROBE_BLOCK_AFTER;
  if (blocked) {
    blockIp(key, "unauthorized checkout probes");
  }

  if (blocked && (!incidentFiledInWindow || now - incidentWindowStartMs >= CHECKOUT_PROBE_WINDOW_MS)) {
    incidentFiledInWindow = true;
    incidentWindowStartMs = now;
    void createOpsIncident({
      sourceAi: "platform-security-ai",
      severity: "high",
      category: "security",
      title: CHECKOUT_PROBE_INCIDENT_TITLE,
      problem: `${CHECKOUT_PROBE_INCIDENT_PROBLEM} Source ${maskIp(key)}.`,
      proposedFix: CHECKOUT_PROBE_INCIDENT_FIX,
      affectedSectionId: "commerce",
      sectionAction: "isolate",
      autoIsolateSection: ENV.isProduction,
      actionsTaken: [
        "Blocked the probing network from checkout",
        ENV.isProduction
          ? "Isolated Shop & Commerce pending owner review"
          : "Development: commerce left online; probing IP is still blocked",
      ],
    }).catch(() => undefined);
  }

  return { blocked, count: bucket.count };
}

export function getCheckoutProbeCount(ip: string): number {
  const bucket = probesByIp.get((ip || "unknown").trim() || "unknown");
  if (!bucket) return 0;
  if (Date.now() - bucket.windowStartMs >= CHECKOUT_PROBE_WINDOW_MS) return 0;
  return bucket.count;
}

export function _resetCheckoutProbesForTests(): void {
  probesByIp.clear();
  incidentFiledInWindow = false;
  incidentWindowStartMs = 0;
}
