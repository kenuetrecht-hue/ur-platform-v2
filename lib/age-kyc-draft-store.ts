import type { AgeKycPickedPhoto } from "./age-kyc-photo-helpers";
import type { AgeKycDocumentType } from "./age-kyc-policy";

export type AgeKycDraft = {
  front: AgeKycPickedPhoto | null;
  back: AgeKycPickedPhoto | null;
  selfie: AgeKycPickedPhoto | null;
  documentType: AgeKycDocumentType;
};

const empty = (): AgeKycDraft => ({
  front: null,
  back: null,
  selfie: null,
  documentType: "driver_license",
});

let draft: AgeKycDraft = empty();

export function loadAgeKycDraft(): AgeKycDraft {
  return { ...draft };
}

export function saveAgeKycDraftSlot(
  slot: "front" | "back" | "selfie",
  photo: AgeKycPickedPhoto,
): AgeKycDraft {
  draft = { ...draft, [slot]: photo };
  return { ...draft };
}

export function saveAgeKycDocumentType(documentType: AgeKycDocumentType): AgeKycDraft {
  draft = { ...draft, documentType };
  return { ...draft };
}

export function clearAgeKycDraft(): void {
  draft = empty();
}
