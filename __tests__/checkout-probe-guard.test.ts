import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_PROBE_BLOCK_AFTER,
  CHECKOUT_PROBE_INCIDENT_PROBLEM,
  CHECKOUT_PROBE_INCIDENT_TITLE,
} from "../lib/checkout-probe-policy";
import {
  getCheckoutProbeCount,
  noteUnauthorizedCheckoutProbe,
  _resetCheckoutProbesForTests,
} from "../server/_core/checkout-probe-guard";
import { isIpBlocked, _resetBlockedIpsForTests } from "../server/_core/api-security";
import { listOpsIncidents, _resetOpsStateForTests } from "../server/_core/platform-ops-service";
import { _resetPlatformSectionsForTests } from "../server/_core/platform-section-flags-service";

describe("checkout probe guard", () => {
  afterEach(() => {
    _resetCheckoutProbesForTests();
    _resetBlockedIpsForTests();
    _resetOpsStateForTests();
    _resetPlatformSectionsForTests();
  });

  it("does not block the first unsigned checkout hit", () => {
    const result = noteUnauthorizedCheckoutProbe("203.0.113.40");
    expect(result.blocked).toBe(false);
    expect(result.count).toBe(1);
    expect(isIpBlocked("203.0.113.40")).toBe(false);
  });

  it("blocks a scanner after repeated unauthorized checkout probes", async () => {
    const ip = "203.0.113.41";
    let last = { blocked: false, count: 0 };
    for (let i = 0; i < CHECKOUT_PROBE_BLOCK_AFTER; i++) {
      last = noteUnauthorizedCheckoutProbe(ip);
    }
    expect(last.blocked).toBe(true);
    expect(isIpBlocked(ip)).toBe(true);
    expect(getCheckoutProbeCount(ip)).toBe(CHECKOUT_PROBE_BLOCK_AFTER);

    await vi.waitFor(() => {
      const incidents = listOpsIncidents();
      expect(incidents.some((item) => item.title === CHECKOUT_PROBE_INCIDENT_TITLE)).toBe(true);
    });
    const incident = listOpsIncidents().find((item) => item.title === CHECKOUT_PROBE_INCIDENT_TITLE);
    expect(incident?.problem).toContain(CHECKOUT_PROBE_INCIDENT_PROBLEM);
    expect(incident?.affectedSectionId).toBe("commerce");
  });

  it("does not block loopback during local development", () => {
    for (let i = 0; i < CHECKOUT_PROBE_BLOCK_AFTER; i++) {
      noteUnauthorizedCheckoutProbe("127.0.0.1");
    }
    expect(isIpBlocked("127.0.0.1")).toBe(false);
  });

  it("does not treat this computer's IPv6-mapped localhost as a scanner", () => {
    for (let i = 0; i < CHECKOUT_PROBE_BLOCK_AFTER; i++) {
      noteUnauthorizedCheckoutProbe("::ffff:127.0.0.1");
    }
    expect(isIpBlocked("::ffff:127.0.0.1")).toBe(false);
    expect(listOpsIncidents().filter((item) => item.title === CHECKOUT_PROBE_INCIDENT_TITLE)).toHaveLength(0);
  });
});
