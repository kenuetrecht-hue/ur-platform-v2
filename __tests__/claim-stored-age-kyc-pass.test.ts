import { afterEach, describe, expect, it, vi } from "vitest";
import { claimStoredAgeKycPass } from "../lib/claim-stored-age-kyc-pass";
import { clearAgeKycPassToken, setAgeKycPassToken } from "../lib/age-kyc-pass-store";

describe("claimStoredAgeKycPass", () => {
  afterEach(() => {
    clearAgeKycPassToken();
  });

  it("returns false when there is no photo pass", async () => {
    const claim = vi.fn();
    await expect(claimStoredAgeKycPass(claim)).resolves.toBe(false);
    expect(claim).not.toHaveBeenCalled();
  });

  it("attaches a stored pass and then clears it", async () => {
    setAgeKycPassToken("pass-token-from-photo-check-1234567890");
    const claim = vi.fn().mockResolvedValue({ verified: true });
    await expect(claimStoredAgeKycPass(claim)).resolves.toBe(true);
    expect(claim).toHaveBeenCalledWith({ passToken: "pass-token-from-photo-check-1234567890" });
    await expect(claimStoredAgeKycPass(claim)).resolves.toBe(false);
  });
});
