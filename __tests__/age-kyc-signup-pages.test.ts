import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  JOIN_ACCOUNT_HREF,
  JOIN_ID_PHOTOS_HREF,
  JOIN_SELFIE_HREF,
} from "../lib/after-sign-in";
import { canContinueToIdPictures } from "../lib/join-account-draft";

describe("signup account / ID / selfie pages", () => {
  it("uses real routes so each page can unmount the last one", () => {
    expect(JOIN_ACCOUNT_HREF).toBe("/signup");
    expect(JOIN_ID_PHOTOS_HREF).toBe("/signup-id");
    expect(JOIN_SELFIE_HREF).toBe("/signup-selfie");
    const signup = readFileSync("app/(auth)/signup.tsx", "utf8");
    const idRoute = readFileSync("app/(auth)/signup-id.tsx", "utf8");
    const selfieRoute = readFileSync("app/(auth)/signup-selfie.tsx", "utf8");
    expect(signup).toContain("FinishAccountAfterIdPass");
    expect(signup).toContain("No ID photo and no selfie");
    expect(signup).toContain("over the age of eighteen");
    expect(signup).not.toContain("AgeKycPhotoCapture");
    expect(idRoute).toContain("Redirect");
    expect(selfieRoute).toContain("Redirect");
    expect(idRoute).not.toContain("SignupIdPictures");
    expect(selfieRoute).not.toContain("SignupSelfieCheck");
  });

  it("does not let people skip the account form or the ID page", () => {
    expect(
      canContinueToIdPictures({
        name: "Ken",
        email: "ken@example.com",
        password: "secret1",
        confirmPassword: "secret1",
        acceptedTerms: true,
        confirmedAdult: true,
        turnstileToken: "",
      }),
    ).toBe(true);
    expect(
      canContinueToIdPictures({
        name: "Ken",
        email: "ken@example.com",
        password: "secret1",
        confirmPassword: "secret1",
        acceptedTerms: false,
        confirmedAdult: true,
        turnstileToken: "",
      }),
    ).toBe(false);
    expect(
      canContinueToIdPictures({
        name: "Ken",
        email: "ken@example.com",
        password: "secret1",
        confirmPassword: "secret1",
        acceptedTerms: true,
        confirmedAdult: false,
        turnstileToken: "",
      }),
    ).toBe(false);
    expect(
      canContinueToIdPictures({
        name: "Ken",
        email: "ken@example.com",
        password: "secret1",
        confirmPassword: "other1",
        acceptedTerms: true,
        confirmedAdult: true,
        turnstileToken: "",
      }),
    ).toBe(false);
    const idRoute = readFileSync("app/(auth)/signup-id.tsx", "utf8");
    const selfieRoute = readFileSync("app/(auth)/signup-selfie.tsx", "utf8");
    expect(idRoute).toContain("JOIN_ACCOUNT_HREF");
    expect(selfieRoute).toContain("JOIN_ACCOUNT_HREF");
  });

  it("keeps Login and Sign up wording", () => {
    const login = readFileSync("app/(auth)/login.tsx", "utf8");
    const signup = readFileSync("app/(auth)/signup.tsx", "utf8");
    expect(login).toContain(">Login<");
    expect(login).toContain(">Sign up<");
    expect(login).not.toContain("Sign in");
    expect(signup).toContain("Sign up");
    expect(signup).toContain("Login");
    expect(signup).not.toContain("Sign in");
  });
});
