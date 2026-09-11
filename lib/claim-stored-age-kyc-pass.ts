import { clearAgeKycDraft } from "@/lib/age-kyc-draft-store";
import { clearAgeKycPassToken, getAgeKycPassToken } from "@/lib/age-kyc-pass-store";

/** Attach the guest photo-check pass to the signed-in account. */
export async function claimStoredAgeKycPass(
  claim: (input: { passToken: string }) => Promise<{ verified?: boolean }>,
): Promise<boolean> {
  const passToken = getAgeKycPassToken();
  if (!passToken) return false;
  const status = await claim({ passToken });
  if (status.verified === true) {
    clearAgeKycPassToken();
    clearAgeKycDraft();
    return true;
  }
  return false;
}
