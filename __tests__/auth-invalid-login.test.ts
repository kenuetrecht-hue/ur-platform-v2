import { describe, expect, it } from "vitest";
import { isInvalidLoginAuthError } from "../lib/auth-invalid-login";

describe("isInvalidLoginAuthError", () => {
  it("matches Supabase invalid login credentials", () => {
    expect(isInvalidLoginAuthError(new Error("Invalid login credentials"))).toBe(true);
    expect(isInvalidLoginAuthError(new Error("Wrong email or password. If you are new, tap Sign up."))).toBe(
      true,
    );
    expect(isInvalidLoginAuthError(new Error("User already registered"))).toBe(false);
  });
});
