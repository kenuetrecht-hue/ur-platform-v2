import { afterEach, describe, expect, it, vi } from "vitest";
import { isDevAgeKycBypassEnabled } from "../lib/dev-age-kyc-mode";

describe("isDevAgeKycBypassEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never skips in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_SKIP_AGE_KYC", "true");
    expect(isDevAgeKycBypassEnabled()).toBe(false);
  });

  it("never skips on Railway", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_SKIP_AGE_KYC", "true");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "production");
    expect(isDevAgeKycBypassEnabled()).toBe(false);
  });

  it("skips by default in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_SKIP_AGE_KYC", "");
    expect(isDevAgeKycBypassEnabled()).toBe(true);
  });

  it("does not skip in tests unless the flag is on", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEV_SKIP_AGE_KYC", "");
    expect(isDevAgeKycBypassEnabled()).toBe(false);
  });

  it("can be turned off in development to test real ID upload", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_SKIP_AGE_KYC", "false");
    expect(isDevAgeKycBypassEnabled()).toBe(false);
  });
});
