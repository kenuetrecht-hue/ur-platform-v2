import { describe, expect, it } from "vitest";
import {
  _resetApiLimitsForTests,
  checkGlobalIpLimit,
  checkIpNamespaceLimit,
  checkUserNamespaceLimit,
  isIpBlocked,
} from "../server/_core/api-security";

describe("video call rate limits", () => {
  it("keeps a signed-in call open without banning the home network", () => {
    _resetApiLimitsForTests();
    const ip = "203.0.113.40";
    for (let i = 0; i < 500; i += 1) {
      checkUserNamespaceLimit("calls", "friend-1");
      checkIpNamespaceLimit("calls", ip);
      expect(checkGlobalIpLimit(ip)).toBe(true);
    }
    expect(isIpBlocked(ip)).toBe(false);
  });

  it("still bans a network that floods login", () => {
    _resetApiLimitsForTests();
    const ip = "203.0.113.41";
    let blocked = false;
    for (let i = 0; i < 25; i += 1) {
      try {
        checkIpNamespaceLimit("auth", ip);
      } catch {
        blocked = true;
      }
    }
    expect(blocked).toBe(true);
    expect(isIpBlocked(ip)).toBe(true);
  });
});
