import { describe, it, expect, beforeEach } from "vitest";
import { isDisposableEmail } from "../lib/bot-abuse-policy";
import {
  assertAuthChallengeAllowed,
  _resetBotAbuseGuardForTests,
} from "../server/_core/bot-abuse-guard";
import {
  __resetContentProtectionForTests,
  registerCreatorIdentity,
} from "../server/_core/creator-content-protection-service";

describe("bot-abuse-policy", () => {
  it("flags common disposable inboxes", () => {
    expect(isDisposableEmail("bot@mailinator.com")).toBe(true);
    expect(isDisposableEmail("person@gmail.com")).toBe(false);
  });
});

describe("bot-abuse-guard", () => {
  beforeEach(() => {
    _resetBotAbuseGuardForTests();
    __resetContentProtectionForTests();
  });

  it("rejects honeypot fills and scripted user agents on login", () => {
    expect(() =>
      assertAuthChallengeAllowed({
        ip: "203.0.113.50",
        action: "login",
        honeypot: "http://spam.example",
        userAgent: "Mozilla/5.0 Chrome/120",
      }),
    ).toThrow(/Security check failed/);

    expect(() =>
      assertAuthChallengeAllowed({
        ip: "203.0.113.51",
        action: "login",
        userAgent: "curl/8.4.0",
      }),
    ).toThrow(/cannot complete the security check/);
  });

  it("blocks disposable signup emails and lookalike creator names", () => {
    registerCreatorIdentity({ userId: "creator-a", displayName: "Captain Ken" });

    expect(() =>
      assertAuthChallengeAllowed({
        ip: "198.51.100.20",
        action: "signup",
        email: "temp@yopmail.com",
        displayName: "New Person",
        userAgent: "Mozilla/5.0 Chrome/120",
      }),
    ).toThrow(/lasting personal or work email/);

    expect(() =>
      assertAuthChallengeAllowed({
        ip: "198.51.100.21",
        action: "signup",
        email: "real.person@example.com",
        displayName: "Captain Ken",
        userAgent: "Mozilla/5.0 Chrome/120",
      }),
    ).toThrow(/too similar/);
  });

  it("allows a normal browser signup", () => {
    expect(() =>
      assertAuthChallengeAllowed({
        ip: "198.51.100.22",
        action: "signup",
        email: "member@example.com",
        displayName: "Marina Jess",
        userAgent: "Mozilla/5.0 Chrome/120",
      }),
    ).not.toThrow();
  });
});
