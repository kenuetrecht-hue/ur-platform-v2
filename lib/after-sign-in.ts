/**
 * After login or signup, open the ID photo page first.
 * Home / Admin only after the 18+ check passes.
 */
export const AFTER_SIGN_IN_HREF = "/age-verify" as const;

export function shouldOpenAgeVerifyPage(params: {
  isAuthenticated: boolean;
  /** True only after the server says the ID check passed. */
  kycVerified: boolean | undefined;
}): boolean {
  return params.isAuthenticated && params.kycVerified !== true;
}
