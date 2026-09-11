import { describe, expect, it } from "vitest";
import {
  ageKycWebCapture,
  countFilledAgeKycSlots,
  photoFromDataUrl,
} from "../lib/age-kyc-photo-helpers";
import type { AgeKycPickedPhoto } from "../lib/age-kyc-photo-helpers";
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

  it("has copy for the three camera slots", () => {
    expect(AGE_VERIFY_PHOTO_HINTS.front.toLowerCase()).toContain("front");
    expect(AGE_VERIFY_PHOTO_HINTS.back.toLowerCase()).toContain("back");
    expect(AGE_VERIFY_PHOTO_HINTS.selfie.toLowerCase()).toContain("selfie");
  });

  it("reads a camera snapshot data URL", () => {
    const photo = photoFromDataUrl("data:image/jpeg;base64,abc");
    expect(photo.mimeType).toBe("image/jpeg");
    expect(photo.base64).toBe("abc");
  });

  it("asks the phone camera for ID back/front and the selfie camera for the face", () => {
    expect(ageKycWebCapture("id")).toBe("environment");
    expect(ageKycWebCapture("selfie")).toBe("user");
    expect(ageKycWebCapture("library")).toBeNull();
  });

  it("rejects a snapshot that is not a photo", () => {
    expect(() => photoFromDataUrl("data:text/plain;base64,abc")).toThrow(/JPEG|PNG|WebP/i);
  });
});
