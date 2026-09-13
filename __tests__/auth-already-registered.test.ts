import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { isAlreadyRegisteredAuthError } from "../lib/auth-already-registered";

describe("already-registered after pictures pass", () => {
  it("treats the Supabase sign-up error as a sign-in cue", () => {
    expect(isAlreadyRegisteredAuthError(new Error("User already registered"))).toBe(true);
    expect(isAlreadyRegisteredAuthError(new Error("Email address is already registered"))).toBe(true);
    expect(isAlreadyRegisteredAuthError(new Error("That email is already on UR"))).toBe(true);
    expect(isAlreadyRegisteredAuthError(new Error("We already collected your information"))).toBe(true);
    expect(isAlreadyRegisteredAuthError(new Error("Invalid login credentials"))).toBe(false);
  });

  it("signs in instead of stopping on the Join page when the email already exists", () => {
    const join = readFileSync("components/finish-account-after-id-pass.tsx", "utf8");
    const auth = readFileSync("lib/auth-context.tsx", "utf8");
    expect(join).toContain("isAlreadyRegisteredAuthError");
    expect(join).toContain("pendingEnterRef");
    expect(join).toContain("shouldEnterAppAfterMemberSignIn");
    expect(join).toContain("getStatus.fetch");
    expect(join).not.toMatch(/action:\s*"login"/);
    expect(auth).toContain("isAlreadyRegisteredAuthError");
    expect(auth).toContain("signInWithPassword");
  });
});
