import { afterEach, describe, expect, it } from "vitest";
import {
  clearAgeKycPassToken,
  getAgeKycPassToken,
  hasAgeKycPassToken,
  setAgeKycPassToken,
} from "../lib/age-kyc-pass-store";

describe("age KYC pass store", () => {
  afterEach(() => {
    clearAgeKycPassToken();
  });

  it("keeps the pass until the person finishes sign-in", () => {
    expect(hasAgeKycPassToken()).toBe(false);
    setAgeKycPassToken("pass.token.example");
    expect(getAgeKycPassToken()).toBe("pass.token.example");
    expect(hasAgeKycPassToken()).toBe(true);
    clearAgeKycPassToken();
    expect(getAgeKycPassToken()).toBeNull();
  });
});
