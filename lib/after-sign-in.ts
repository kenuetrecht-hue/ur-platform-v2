/**
 * After login or signup without a photo-check pass, open the ID page.
 * When photos already passed, go straight into the app.
 */
export const AFTER_SIGN_IN_HREF = "/age-verify" as const;
/**
 * Real Home URL. `/(tabs)` and `/(tabs)/index` are layouts on the website —
 * they render a blank white page. `/home` is a screen people can open.
 */
export const AFTER_ID_PASS_HREF = "/home" as const;
export const AFTER_JOIN_WELCOME_HREF = "/e-manual?joined=1" as const;
/** Returning members: email + password. New members use /signup, then ID, then selfie. */
export const RETURNING_LOGIN_HREF = "/login" as const;
export const JOIN_ACCOUNT_HREF = "/signup" as const;
export const JOIN_ID_PHOTOS_HREF = "/signup-id" as const;
export const JOIN_SELFIE_HREF = "/signup-selfie" as const;

/** Account, ID, and selfie pages in the new join path — not leftover /age-verify. */
export function isJoinFlowPath(path: string): boolean {
  return path.includes("signup") && !isLoginOrSignupDoorPath(path);
}

/** Typed /login or /signup in the address bar — show that door when signed out. */
export function isLoginOrSignupDoorPath(path: string): boolean {
  const normalized = path.replace(/^\//, "").toLowerCase();
  const last = normalized.split("/").filter(Boolean).pop() ?? "";
  return last === "login" || last === "signup" || last === "signin";
}

export function isLoginDoorPath(path: string): boolean {
  const normalized = path.replace(/^\//, "").toLowerCase();
  const last = normalized.split("/").filter(Boolean).pop() ?? "";
  return last === "login" || last === "signin";
}

/** Already signed in with ID passed — do not leave them on Login after they reopen the app. */
export function shouldResumeHomeFromLoginDoor(params: {
  isAuthenticated: boolean;
  kycVerified: boolean;
  onLoginDoor: boolean;
}): boolean {
  return params.isAuthenticated && params.kycVerified && params.onLoginDoor;
}

/** Already signed in on this phone or computer — open the app. The ID guard still applies. */
export function hrefWhenAlreadySignedIn(): typeof AFTER_ID_PASS_HREF {
  return AFTER_ID_PASS_HREF;
}

/** Signed out: simple login, not the join-and-pictures page. */
export function hrefForSignedOutUser(): typeof RETURNING_LOGIN_HREF {
  return RETURNING_LOGIN_HREF;
}

export function hrefAfterSignIn(photosAlreadyPassed: boolean): typeof AFTER_ID_PASS_HREF | typeof JOIN_ACCOUNT_HREF {
  return photosAlreadyPassed ? AFTER_ID_PASS_HREF : JOIN_ACCOUNT_HREF;
}

export function shouldOpenAgeVerifyPage(params: {
  isAuthenticated: boolean;
  /** True only after the server says the ID check passed. Undefined = not answered yet. */
  kycVerified: boolean | undefined;
  /** Guest photo token is not a pass into the app. Keep them on Sign up until the account is verified. */
  hasPhotoPass?: boolean;
}): boolean {
  return params.isAuthenticated && params.kycVerified === false;
}

/** True only after the server answered. A failed phone fetch is not “needs pictures.” */
export function isKycStatusKnown(params: {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}): boolean {
  return !params.isLoading && !params.isError && params.hasData;
}

/** Sign-up may open the site only after the 18+ pass is on the account — not from a leftover device token. */
export function shouldEnterAppAfterSignupClaim(claimedOnAccount: boolean): boolean {
  return claimedOnAccount === true;
}

/**
 * New people must attach the photo pass. Returning members whose account
 * already has the 18+ pass should enter even if a leftover guest token fails.
 */
export function shouldEnterAppAfterMemberSignIn(params: {
  claimedOnAccount: boolean;
  accountAlreadyVerified: boolean;
}): boolean {
  return params.claimedOnAccount === true || params.accountAlreadyVerified === true;
}

/** Keep email and password on screen until the server says the ID check passed. */
export function shouldKeepCredentialFormVisible(params: {
  hasPhotoPass: boolean;
  kycVerified: boolean | undefined;
}): boolean {
  return params.kycVerified !== true;
}

/** Leftover /age-verify is not a door. Signed-out people go to Login. */
export function shouldSendSignedOutUserToLoginFromAgeVerify(): boolean {
  return true;
}

/** A failed KYC fetch must not bounce Sign up ↔ Login. Stay on Sign up. */
export function shouldSendAuthenticatedJoinToLogin(_params: {
  isAuthenticated: boolean;
  kycQueryFailed: boolean;
}): boolean {
  return false;
}

/** Only send Login → Sign up when we know the account has not passed ID. */
export function shouldSendAuthenticatedUserToJoinPictures(params: {
  kycStatusKnown: boolean;
  kycVerified: boolean;
}): boolean {
  return params.kycStatusKnown && params.kycVerified === false;
}

/** After the server has the 18+ pass, leave the leftover photo page and enter the app. */
export function shouldEnterAppFromAgeVerify(params: {
  isAuthenticated: boolean;
  kycVerified: boolean;
}): boolean {
  return params.isAuthenticated && params.kycVerified;
}
