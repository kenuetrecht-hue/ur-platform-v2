import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  EXISTING_ACCOUNT_AFTER_PICTURES,
  EXISTING_ACCOUNT_LOGIN_HINT,
  isExistingAccountJoinError,
  loginHrefForExistingAccount,
} from "../lib/existing-join-login";

describe("existing email after pictures", () => {
  it("sends people to Login with a first-password hint and a reset button", () => {
    expect(loginHrefForExistingAccount()).toBe("/login?existing=1");
    expect(EXISTING_ACCOUNT_AFTER_PICTURES.toLowerCase()).toContain("first password");
    expect(EXISTING_ACCOUNT_LOGIN_HINT.toLowerCase()).toContain("send a new password");
    expect(isExistingAccountJoinError(EXISTING_ACCOUNT_AFTER_PICTURES)).toBe(true);
    const login = readFileSync("components/returning-account-login.tsx", "utf8");
    const hook = readFileSync("hooks/use-enter-app-after-pictures.ts", "utf8");
    const signin = readFileSync("lib/supabase-password-signin.ts", "utf8");
    expect(login).toContain("Send a new password to this email");
    expect(login).toContain("loadJoinAccountDraft");
    expect(hook).toContain("EXISTING_ACCOUNT_AFTER_PICTURES");
    expect(signin).toContain("signInWithPasswordRetryingCaptcha");
    expect(signin).toContain("Never send a Turnstile");
    expect(readFileSync("app/(auth)/new-password.tsx", "utf8")).toContain("Save password and go to Login");
  });
});
