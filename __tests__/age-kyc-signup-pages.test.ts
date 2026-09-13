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
    expect(signup).toContain("Sign up");
    expect(signup).not.toContain("AgeKycPhotoCapture");
    expect(idRoute).toContain("SignupIdPictures");
    expect(readFileSync("components/signup-id-pictures.tsx", "utf8")).toContain("JOIN_SELFIE_HREF");
    expect(selfieRoute).toContain("SignupSelfieCheck");
    expect(selfieRoute).toContain("useEnterAppAfterPictures");
    expect(selfieRoute).not.toContain("SignupIdPictures");
  });

  it("does not let people skip the account form or the ID page", () => {
    expect(
      canContinueToIdPictures({
        name: "Ken",
        email: "ken@example.com",
        password: "secret1",
        acceptedTerms: true,
        turnstileToken: "",
      }),
    ).toBe(true);
    expect(
      canContinueToIdPictures({
        name: "Ken",
        email: "ken@example.com",
        password: "secret1",
        acceptedTerms: false,
        turnstileToken: "",
      }),
    ).toBe(false);
    const idRoute = readFileSync("app/(auth)/signup-id.tsx", "utf8");
    const selfieRoute = readFileSync("app/(auth)/signup-selfie.tsx", "utf8");
    expect(idRoute).toContain("canContinueToIdPictures");
    expect(selfieRoute).toContain("canContinueToSelfiePage");
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
