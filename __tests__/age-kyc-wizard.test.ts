import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import {
  ageKycWizardTitle,
  canContinueToSelfiePage,
  initialAgeKycIdStep,
  initialAgeKycSelfieStep,
  nextAgeKycIdWizardStep,
  nextAgeKycSelfieWizardStep,
  nextAgeKycWizardStep,
} from "../lib/age-kyc-wizard";

describe("age KYC wizard", () => {
  it("keeps ID on one page and selfie on the next", () => {
    expect(nextAgeKycIdWizardStep("front")).toBe("back");
    expect(nextAgeKycIdWizardStep("back")).toBe("id-ready");
    expect(nextAgeKycSelfieWizardStep("selfie")).toBe("review");
    expect(nextAgeKycWizardStep("front")).toBe("back");
    expect(nextAgeKycWizardStep("back")).toBe("selfie");
    expect(nextAgeKycWizardStep("selfie")).toBe("review");
    expect(ageKycWizardTitle("front")).toMatch(/id page/i);
    expect(ageKycWizardTitle("selfie")).toMatch(/selfie/i);
    expect(ageKycWizardTitle("review")).toMatch(/review/i);
    expect(canContinueToSelfiePage({ front: { ok: true }, back: { ok: true } })).toBe(true);
    expect(canContinueToSelfiePage({ front: { ok: true }, back: null })).toBe(false);
    expect(initialAgeKycIdStep({ front: null, back: null })).toBe("front");
    expect(initialAgeKycIdStep({ front: {}, back: {} })).toBe("id-ready");
    expect(initialAgeKycSelfieStep({ selfie: null })).toBe("selfie");
  });

  it("mounts one live camera per page and does not re-fire pass on every render", () => {
    const capture = readFileSync("components/age-kyc-photo-capture.tsx", "utf8");
    const idPage = readFileSync("components/signup-id-pictures.tsx", "utf8");
    const selfie = readFileSync("components/signup-selfie-check.tsx", "utf8");
    const finish = readFileSync("components/finish-account-after-id-pass.tsx", "utf8");
    expect(capture).toContain('phase: AgeKycCapturePhase');
    expect(capture).toContain("pickAgeKycLibraryPhoto");
    expect(capture).toContain("age-kyc-review");
    expect(idPage).toContain('phase="id"');
    expect(idPage).not.toContain('phase="selfie"');
    expect(selfie).toContain('phase="selfie"');
    expect(selfie).toContain("notifiedPassRef");
    expect(selfie).toContain("Check my ID and selfie");
    expect(finish).not.toContain("AgeKycPhotoCapture");
    expect(finish).not.toContain("IdCheckDuringSignin");
  });
});
