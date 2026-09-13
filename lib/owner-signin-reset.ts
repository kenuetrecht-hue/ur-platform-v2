/** Owner must type this before clearing a member's sign-in. */
export const OWNER_SIGNIN_RESET_CONFIRM = "RESET" as const;

export type OwnerSigninResetAction = "send_new_password" | "clear_so_they_can_signup";

export function isOwnerSigninResetConfirmed(phrase: string | undefined): boolean {
  return phrase?.trim().toUpperCase() === OWNER_SIGNIN_RESET_CONFIRM;
}

export function describeOwnerSigninReset(action: OwnerSigninResetAction, found: boolean): string {
  if (!found) {
    return "No sign-in on that email. They can Sign up with it now.";
  }
  if (action === "send_new_password") {
    return "A new-password email was sent. Tell them to open it and set a password on New password.";
  }
  return "Sign-in and ID picture records on that email were cleared. They can Sign up again, take pictures again, and choose a new password.";
}
