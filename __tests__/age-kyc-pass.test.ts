import { describe, expect, it } from "vitest";
import { issueAgeKycPassToken, verifyAgeKycPassToken } from "../server/_core/age-kyc-pass";

describe("age KYC pass token", () => {
  it("issues a token that verifies with the same photo hashes", () => {
    const hashes = { front: "aaa", back: "bbb", selfie: "ccc" };
    const token = issueAgeKycPassToken(hashes);
    expect(token.includes(".")).toBe(true);
    const payload = verifyAgeKycPassToken(token);
    expect(payload?.front).toBe("aaa");
    expect(payload?.back).toBe("bbb");
    expect(payload?.selfie).toBe("ccc");
  });

  it("rejects a tampered token", () => {
    const token = issueAgeKycPassToken({ front: "aaa", back: "bbb", selfie: "ccc" });
    expect(verifyAgeKycPassToken(`${token}x`)).toBeNull();
    expect(verifyAgeKycPassToken("not-a-token")).toBeNull();
  });
});
