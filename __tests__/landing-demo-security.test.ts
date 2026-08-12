import { describe, it, expect, beforeEach } from "vitest";
import {
  LANDING_DEMO_MESSAGE_MAX,
  LANDING_DEMO_REPLY_MAX,
  truncateLandingDemoReply,
  isSuspiciousDemoMessage,
  isSuspiciousDemoUserAgent,
  buildLandingDemoPromptAppend,
} from "../lib/landing-demo-policy";
import {
  issueLandingDemoToken,
  verifyLandingDemoToken,
  assertLandingDemoSendAllowed,
  _resetLandingDemoGuardForTests,
} from "../server/_core/landing-demo-guard";
import {
  hasUsedDemo,
  markDemoUsed,
  canUseDemoVoice,
  _resetLandingDemoUsageForTests,
} from "../server/_core/landing-demo-service";

describe("landing-demo-policy", () => {
  it("exports expected caps", () => {
    expect(LANDING_DEMO_MESSAGE_MAX).toBe(150);
    expect(LANDING_DEMO_REPLY_MAX).toBe(50);
  });

  it("truncates long replies at word boundary when possible", () => {
    const long = "Fuel lines need a fresh filter and spark check before you chase ghosts.";
    expect(truncateLandingDemoReply(long, 50).length).toBeLessThanOrEqual(51);
  });

  it("flags bot user agents", () => {
    expect(isSuspiciousDemoUserAgent("curl/8.0")).toBe(true);
    expect(isSuspiciousDemoUserAgent("Mozilla/5.0 Chrome/120")).toBe(false);
  });

  it("flags spammy messages", () => {
    expect(isSuspiciousDemoMessage("aaaaaaaaaaaaaaaaaaaa")).toBe(true);
    expect(isSuspiciousDemoMessage("How do I winterize my outboard?")).toBe(false);
  });

  it("builds short landing prompt", () => {
    expect(buildLandingDemoPromptAppend("Marina Mechanic")).toContain("50");
  });
});

describe("landing-demo-guard", () => {
  beforeEach(() => {
    _resetLandingDemoGuardForTests();
    _resetLandingDemoUsageForTests();
  });

  it("issues and verifies IP-bound demo tokens", () => {
    const token = issueLandingDemoToken("203.0.113.10");
    expect(verifyLandingDemoToken(token, "203.0.113.10")).toBe(true);
    expect(verifyLandingDemoToken(token, "203.0.113.11")).toBe(false);
  });

  it("rejects honeypot and instant bot sends", () => {
    const ip = "198.51.100.4";
    const token = issueLandingDemoToken(ip);

    expect(() =>
      assertLandingDemoSendAllowed({
        ip,
        demoToken: token,
        pageLoadedAtMs: Date.now(),
        honeypot: "spam@bots.com",
        message: "How do I fix my engine?",
        userAgent: "Mozilla/5.0",
      }),
    ).toThrow(/Demo unavailable/);

    expect(() =>
      assertLandingDemoSendAllowed({
        ip,
        demoToken: token,
        pageLoadedAtMs: Date.now(),
        message: "How do I fix my engine?",
        userAgent: "Mozilla/5.0",
      }),
    ).toThrow(/wait a moment/);
  });

  it("allows send after min page time with valid token", () => {
    const ip = "198.51.100.5";
    const token = issueLandingDemoToken(ip);

    expect(() =>
      assertLandingDemoSendAllowed({
        ip,
        demoToken: token,
        pageLoadedAtMs: Date.now() - 5_000,
        message: "How do I fix my engine?",
        userAgent: "Mozilla/5.0 Chrome/120",
      }),
    ).not.toThrow();
  });
});

describe("landing-demo-service usage", () => {
  beforeEach(() => _resetLandingDemoUsageForTests());

  it("tracks one demo per IP", () => {
    const ip = "192.0.2.44";
    expect(hasUsedDemo(ip)).toBe(false);
    markDemoUsed(ip);
    expect(hasUsedDemo(ip)).toBe(true);
    expect(canUseDemoVoice(ip)).toBe(true);
  });
});
