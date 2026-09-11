import { describe, expect, it } from "vitest";
import { clearAgeKycDraft, loadAgeKycDraft, saveAgeKycDraftSlot } from "../lib/age-kyc-draft-store";
import type { AgeKycPickedPhoto } from "../lib/age-kyc-photo-helpers";

const sample: AgeKycPickedPhoto = {
  mimeType: "image/jpeg",
  base64: "abc",
  previewUri: "data:image/jpeg;base64,abc",
};

describe("age KYC draft store", () => {
  it("keeps ID photos while the person finishes signing in", () => {
    clearAgeKycDraft();
    saveAgeKycDraftSlot("front", sample);
    saveAgeKycDraftSlot("selfie", sample);
    const draft = loadAgeKycDraft();
    expect(draft.front?.base64).toBe("abc");
    expect(draft.back).toBeNull();
    expect(draft.selfie?.base64).toBe("abc");
    clearAgeKycDraft();
    expect(loadAgeKycDraft().front).toBeNull();
  });
});
