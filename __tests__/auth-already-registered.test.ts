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
    const hook = readFileSync("hooks/use-enter-app-after-pictures.ts", "utf8");
    const persist = readFileSync("lib/persist-join-password.ts", "utf8");
    const auth = readFileSync("lib/auth-context.tsx", "utf8");
    expect(persist).toContain("isAlreadyRegisteredAuthError");
    expect(persist).toContain("signInWithPassword");
    expect(hook).toContain("isAlreadyRegisteredAuthError");
    expect(hook).toContain("pendingEnterRef");
    expect(hook).toContain("shouldEnterAppAfterMemberSignIn");
    expect(hook).toContain("getStatus.fetch");
    expect(auth).toContain("isAlreadyRegisteredAuthError");
    expect(auth).toContain("signInWithPassword");
  });
});
