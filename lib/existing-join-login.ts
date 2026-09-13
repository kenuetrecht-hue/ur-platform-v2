/** Shown after pictures pass when the email is already on the sign-in service. */
export const EXISTING_ACCOUNT_AFTER_PICTURES =
  "This email already joined UR. A new password on Sign up does not replace the first one. Tap Back to Login and use the first password, or tap Send a new password to this email. You do not take the pictures again.";

export const EXISTING_ACCOUNT_LOGIN_HINT =
  "This email already joined UR. A new password on Sign up does not replace the first one. Use the first password, or tap Send a new password to this email.";

export function loginHrefForExistingAccount(): "/login?existing=1" {
  return "/login?existing=1";
}

export function isExistingAccountJoinError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already joined") ||
    lower.includes("already has an account") ||
    lower.includes("first password") ||
    lower.includes("same password you first used")
  );
}
