import { describe, expect, it, vi } from "vitest";
import {
  _resetApiLimitsForTests,
  blockIp,
  checkGlobalIpLimit,
  checkIpNamespaceLimit,
  checkUserNamespaceLimit,
  getClientIp,
  isCloudflareEdgeIp,
  isIpBlocked,
} from "../server/_core/api-security";
import type { Request } from "express";

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

  it("lets a signed-in member keep opening the account through an hour of status checks", () => {
    _resetApiLimitsForTests();
    for (let i = 0; i < 400; i += 1) {
      checkUserNamespaceLimit("auth", "member-1");
    }
    expect(isIpBlocked("203.0.113.77")).toBe(false);
  });

  it("slows a login flood without locking the member out of the rest of the site", () => {
    _resetApiLimitsForTests();
    const ip = "203.0.113.41";
    let slowed = false;
    for (let i = 0; i < 25; i += 1) {
      try {
        checkIpNamespaceLimit("auth", ip);
      } catch {
        slowed = true;
      }
    }
    expect(slowed).toBe(true);
    expect(isIpBlocked(ip)).toBe(false);
  });

  it("lifts a network block after ten minutes", () => {
    _resetApiLimitsForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T20:00:00Z"));
    blockIp("203.0.113.50", "test");
    expect(isIpBlocked("203.0.113.50")).toBe(true);
    vi.setSystemTime(new Date("2026-10-20T20:10:01Z"));
    expect(isIpBlocked("203.0.113.50")).toBe(false);
    vi.useRealTimers();
  });

  it("uses the member address when the first hop is Cloudflare", () => {
    const req = {
      headers: {
        "x-forwarded-for": "172.68.12.11",
        "cf-connecting-ip": "2602:f9d0:1d4:8700::1",
      },
      socket: { remoteAddress: "172.68.12.11" },
    } as unknown as Request;
    expect(isCloudflareEdgeIp("172.68.12.11")).toBe(true);
    expect(getClientIp(req)).toBe("2602:f9d0:1d4:8700::1");
  });
});
