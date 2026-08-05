import { describe, it, expect, beforeEach } from "vitest";
import {
  recordLoyaltyEvent,
  getLoyaltyEvents,
  fingerprintIp,
  _clearLoyaltyTrackingForTests,
} from "../server/_core/loyalty-tracking-service";

describe("loyalty tracking service", () => {
  beforeEach(() => {
    _clearLoyaltyTrackingForTests();
  });

  it("records append-only events per user", () => {
    recordLoyaltyEvent({
      userId: "42",
      eventType: "daily_sign_in",
      pointsDelta: 50,
      balanceAfter: 1050,
      streakDays: 1,
      signInDate: "2026-08-01",
      description: "Daily sign-in",
      audit: { requestId: "req-1", ipFingerprint: fingerprintIp("127.0.0.1") },
    });

    const { events, total } = getLoyaltyEvents("42", 10);
    expect(total).toBe(1);
    expect(events[0]?.pointsDelta).toBe(50);
    expect(events[0]?.requestId).toBe("req-1");
  });

  it("does not expose raw IP in client-visible events", () => {
    recordLoyaltyEvent({
      userId: "99",
      eventType: "welcome_bonus",
      pointsDelta: 1000,
      balanceAfter: 1000,
      streakDays: 0,
      description: "Welcome",
      audit: { ipFingerprint: fingerprintIp("203.0.113.50") },
    });
    const event = getLoyaltyEvents("99", 1).events[0];
    expect(event).toBeDefined();
    expect(JSON.stringify(event)).not.toContain("203.0.113.50");
  });

  it("hashes IP fingerprints consistently", () => {
    expect(fingerprintIp("1.2.3.4")).toBe(fingerprintIp("1.2.3.4"));
    expect(fingerprintIp("1.2.3.4")).not.toBe(fingerprintIp("5.6.7.8"));
  });
});
