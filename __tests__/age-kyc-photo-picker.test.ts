import { describe, expect, it } from "vitest";
import { countFilledAgeKycSlots, type AgeKycPickedPhoto } from "../lib/age-kyc-photo-picker";
import { AGE_VERIFY_PHOTO_HINTS } from "../lib/signup-step-copy";

const sample: AgeKycPickedPhoto = {
  mimeType: "image/jpeg",
  base64: "abc",
  previewUri: "data:image/jpeg;base64,abc",
};

describe("countFilledAgeKycSlots", () => {
  it("counts how many of the three pictures are recorded", () => {
    expect(countFilledAgeKycSlots({ front: null, back: null, selfie: null })).toBe(0);
    expect(countFilledAgeKycSlots({ front: sample, back: null, selfie: null })).toBe(1);
    expect(countFilledAgeKycSlots({ front: sample, back: sample, selfie: sample })).toBe(3);
  });

  it("has copy for the three camera tabs", () => {
    expect(AGE_VERIFY_PHOTO_HINTS.front.toLowerCase()).toContain("front");
    expect(AGE_VERIFY_PHOTO_HINTS.back.toLowerCase()).toContain("back");
    expect(AGE_VERIFY_PHOTO_HINTS.selfie.toLowerCase()).toContain("selfie");
  });
});
