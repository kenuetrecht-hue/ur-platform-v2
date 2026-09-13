/**
 * After login or signup without a photo-check pass, open the ID page.
 * When photos already passed, go straight into the app.
 */
export const AFTER_SIGN_IN_HREF = "/age-verify" as const;
export const AFTER_ID_PASS_HREF = "/(tabs)" as const;
/** Returning members: email + password. New members use /signup for pictures. */
export const RETURNING_LOGIN_HREF = "/login" as const;
export const JOIN_ACCOUNT_HREF = "/signup" as const;

/** Already signed in on this phone or computer — open the app. The ID guard still applies. */
export function hrefWhenAlreadySignedIn(): typeof AFTER_ID_PASS_HREF {
  return AFTER_ID_PASS_HREF;
}

/** Signed out: simple login, not the join-and-pictures page. */
export function hrefForSignedOutUser(): typeof RETURNING_LOGIN_HREF {
  return RETURNING_LOGIN_HREF;
}

export function hrefAfterSignIn(photosAlreadyPassed: boolean): typeof AFTER_ID_PASS_HREF | typeof AFTER_SIGN_IN_HREF {
  return photosAlreadyPassed ? AFTER_ID_PASS_HREF : AFTER_SIGN_IN_HREF;
}

export function shouldOpenAgeVerifyPage(params: {
  isAuthenticated: boolean;
  /** True only after the server says the ID check passed. */
  kycVerified: boolean | undefined;
  /** Guest photo token is not a pass into the app. Keep them on Sign up until the account is verified. */
  hasPhotoPass?: boolean;
}): boolean {
  return params.isAuthenticated && params.kycVerified !== true;
}

/** Sign-up may open the site only after the 18+ pass is on the account — not from a leftover device token. */
export function shouldEnterAppAfterSignupClaim(claimedOnAccount: boolean): boolean {
  return claimedOnAccount === true;
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
