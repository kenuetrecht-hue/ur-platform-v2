import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { ageKycPrecheckUrlFromTrpc } from "../lib/age-kyc-precheck-url";
import { AGE_KYC_SEND_MAX_EDGE, AGE_KYC_SEND_QUALITY } from "../lib/age-kyc-photo-helpers";

describe("fast ID picture check", () => {
  it("posts binary photos to a dedicated route instead of a giant JSON body", () => {
    expect(ageKycPrecheckUrlFromTrpc("https://example.com/api/trpc")).toBe(
      "https://example.com/api/age-kyc/precheck",
    );
    const route = readFileSync("server/_core/age-kyc-fast-route.ts", "utf8");
    expect(route).toContain('app.post("/api/age-kyc/precheck"');
    expect(route).toContain("multer");
    const googleAi = readFileSync("server/_core/google-ai.ts", "utf8");
    expect(googleAi).toContain(".slice(0, 3)");
    expect(googleAi).not.toContain(".slice(0, 2)");
  });

  it("keeps pictures near 1 megapixel like other ID apps", () => {
    expect(AGE_KYC_SEND_MAX_EDGE).toBeLessThanOrEqual(1024);
    expect(AGE_KYC_SEND_QUALITY).toBeLessThanOrEqual(0.65);
  });
});
