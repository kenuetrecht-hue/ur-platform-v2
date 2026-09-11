import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/_core/google-ai", () => ({
  generateGoogleChatReply: vi.fn(),
  isGoogleCloudAiConfigured: vi.fn(() => true),
}));

vi.mock("../server/db", () => ({
  getKycVerification: vi.fn(async () => null),
  updateKycVerification: vi.fn(async () => undefined),
  createKycVerification: vi.fn(async () => undefined),
}));

vi.mock("../server/_core/creator-content-protection-service", () => ({
  markCreatorIdentityVerified: vi.fn(),
}));

vi.mock("../lib/dev-age-kyc-mode", () => ({
  isDevAgeKycBypassEnabled: () => false,
}));

import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "../server/_core/google-ai";
import {
  claimAgeKycPass,
  precheckAgeKyc,
  resetAgeKycMemoryForTests,
} from "../server/_core/age-kyc-service";

const PHOTO = { mimeType: "image/jpeg" as const, base64: "a".repeat(120) };

function passJson() {
  return JSON.stringify({
    isGovernmentIdFront: true,
    isGovernmentIdBack: true,
    dateOfBirth: "1990-05-20",
    documentExpired: false,
    faceMatch: true,
    faceMatchScore: 92,
    selfieLooksLive: true,
    rejectionReasons: [],
  });
}

function failJson() {
  return JSON.stringify({
    isGovernmentIdFront: false,
    isGovernmentIdBack: false,
    dateOfBirth: null,
    documentExpired: false,
    faceMatch: false,
    faceMatchScore: 10,
    selfieLooksLive: false,
    rejectionReasons: ["Not an ID"],
  });
}

describe("age KYC precheck before sign-in", () => {
  beforeEach(() => {
    resetAgeKycMemoryForTests();
    vi.mocked(generateGoogleChatReply).mockReset();
    vi.mocked(isGoogleCloudAiConfigured).mockReturnValue(true);
  });

  it("returns no pass token when the pictures fail", async () => {
    vi.mocked(generateGoogleChatReply).mockResolvedValue({ reply: failJson(), model: "test" });
    const result = await precheckAgeKyc({
      ip: "203.0.113.10",
      documentType: "driver_license",
      idFront: PHOTO,
      idBack: PHOTO,
      selfie: PHOTO,
    });
    expect(result.verified).toBe(false);
    expect(result.passToken).toBeNull();
    expect(result.rejectionReason).toBeTruthy();
  });

  it("returns a pass token when the pictures succeed, then claim attaches it to the account", async () => {
    vi.mocked(generateGoogleChatReply).mockResolvedValue({ reply: passJson(), model: "test" });
    const result = await precheckAgeKyc({
      ip: "203.0.113.11",
      documentType: "driver_license",
      idFront: PHOTO,
      idBack: PHOTO,
      selfie: PHOTO,
    });
    expect(result.verified).toBe(true);
    expect(result.passToken).toBeTruthy();
    const claimed = await claimAgeKycPass({
      userId: 42,
      passToken: result.passToken ?? "",
    });
    expect(claimed.verified).toBe(true);
  });

  it("tells the person when the photo checker is not ready", async () => {
    vi.mocked(isGoogleCloudAiConfigured).mockReturnValue(false);
    await expect(
      precheckAgeKyc({
        ip: "203.0.113.12",
        documentType: "driver_license",
        idFront: PHOTO,
        idBack: PHOTO,
        selfie: PHOTO,
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/photo checker is not ready/i),
    });
  });
});
