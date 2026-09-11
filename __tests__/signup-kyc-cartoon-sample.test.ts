import { describe, expect, it } from "vitest";
import {
  SIGNUP_KYC_CARTOON_BLURB,
  SIGNUP_KYC_CARTOON_HEADLINE,
  SIGNUP_KYC_CARTOON_ID,
  SIGNUP_KYC_CARTOON_QUALITY_NOTE,
  SIGNUP_KYC_CARTOON_SAMPLE,
} from "../lib/signup-kyc-cartoon-sample";

describe("signup KYC cartoon sample", () => {
  it("ships a complimentary Premiere-style sample with unique frames", () => {
    expect(SIGNUP_KYC_CARTOON_SAMPLE.id).toBe(SIGNUP_KYC_CARTOON_ID);
    expect(SIGNUP_KYC_CARTOON_SAMPLE.complimentary).toBe(true);
    expect(SIGNUP_KYC_CARTOON_SAMPLE.tier).toBe("premiere");
    expect(SIGNUP_KYC_CARTOON_SAMPLE.billedSeconds).toBe(0);
    expect(SIGNUP_KYC_CARTOON_SAMPLE.scenes).toHaveLength(6);
    expect(SIGNUP_KYC_CARTOON_SAMPLE.totalSeconds).toBe(36);
    expect(SIGNUP_KYC_CARTOON_SAMPLE.characterName).toBe("Uri");
    const frames = SIGNUP_KYC_CARTOON_SAMPLE.scenes.map((scene) => scene.frameSvg);
    expect(new Set(frames).size).toBe(6);
    for (const scene of SIGNUP_KYC_CARTOON_SAMPLE.scenes) {
      expect(scene.frameSvg).toContain("<svg");
      expect(scene.narration.length).toBeGreaterThan(20);
    }
    expect(frames.join(" ")).toMatch(/FRONT/i);
    expect(frames.join(" ")).toMatch(/BACK/i);
    expect(frames.join(" ")).toMatch(/SELFIE/i);
    expect(frames.join(" ")).toMatch(/SCREENSHOT/i);
  });

  it("explains front, the extra back shot, selfie, privacy, and that photos are still required", () => {
    const text = [
      SIGNUP_KYC_CARTOON_HEADLINE,
      SIGNUP_KYC_CARTOON_BLURB,
      SIGNUP_KYC_CARTOON_QUALITY_NOTE,
      SIGNUP_KYC_CARTOON_SAMPLE.script,
    ]
      .join(" ")
      .toLowerCase();
    expect(text).toContain("premiere");
    expect(text).toContain("cartoon studio");
    expect(text).toContain("id front");
    expect(text).toContain("id back");
    expect(text).toContain("date of birth");
    expect(text).toContain("barcode");
    expect(text).toContain("screenshot");
    expect(text).toContain("selfie");
    expect(text).toContain("18");
    expect(text).toContain("does not keep the id pictures");
    expect(text).toMatch(/does not skip/);
    expect(text).toContain("still take the three pictures");
    expect(text).toContain("one-time");
    expect(text).toContain("understand fully you do not want to do this");
    expect(text).toContain("thank you");
    expect(text).toContain("extra step");
    expect(text).not.toContain("sorry");
  });

  it("does not claim the cartoon replaces the ID check or Hollywood film", () => {
    const text = `${SIGNUP_KYC_CARTOON_BLURB} ${SIGNUP_KYC_CARTOON_SAMPLE.script} ${SIGNUP_KYC_CARTOON_QUALITY_NOTE}`.toLowerCase();
    expect(text).toMatch(/does not skip the check/);
    expect(text).not.toContain("no id needed");
    expect(text).not.toContain("optional id");
    expect(text).not.toContain("hollywood");
  });
});
