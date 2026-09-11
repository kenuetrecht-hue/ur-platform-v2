/**
 * After login or signup without a photo-check pass, open the ID page.
 * When photos already passed, go straight into the app.
 */
export const AFTER_SIGN_IN_HREF = "/age-verify" as const;
export const AFTER_ID_PASS_HREF = "/(tabs)" as const;

export function hrefAfterSignIn(photosAlreadyPassed: boolean): typeof AFTER_ID_PASS_HREF | typeof AFTER_SIGN_IN_HREF {
  return photosAlreadyPassed ? AFTER_ID_PASS_HREF : AFTER_SIGN_IN_HREF;
}

export function shouldOpenAgeVerifyPage(params: {
  isAuthenticated: boolean;
  /** True only after the server says the ID check passed. */
  kycVerified: boolean | undefined;
  /** Guest photo check already passed — stay on login/signup to type email and password. */
  hasPhotoPass?: boolean;
}): boolean {
  if (params.hasPhotoPass) return false;
  return params.isAuthenticated && params.kycVerified !== true;
}

/** Keep email and password on screen until the server says the ID check passed. */
export function shouldKeepCredentialFormVisible(params: {
  hasPhotoPass: boolean;
  kycVerified: boolean | undefined;
}): boolean {
  return params.kycVerified !== true;
}

/** People may open the ID page before they finish signing in — do not bounce them back to login. */
export function shouldSendSignedOutUserToLoginFromAgeVerify(): boolean {
  return false;
}

/** After the server has the 18+ pass, leave the leftover photo page and enter the app. */
export function shouldEnterAppFromAgeVerify(params: {
  isAuthenticated: boolean;
  kycVerified: boolean;
}): boolean {
  return params.isAuthenticated && params.kycVerified;
}
