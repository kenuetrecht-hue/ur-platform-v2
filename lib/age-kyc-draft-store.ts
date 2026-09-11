import type { AgeKycPickedPhoto } from "./age-kyc-photo-helpers";

export type AgeKycDraft = {
  front: AgeKycPickedPhoto | null;
  back: AgeKycPickedPhoto | null;
  selfie: AgeKycPickedPhoto | null;
};

const empty: AgeKycDraft = { front: null, back: null, selfie: null };

let draft: AgeKycDraft = { ...empty };

export function loadAgeKycDraft(): AgeKycDraft {
  return { ...draft };
}

export function saveAgeKycDraftSlot(slot: keyof AgeKycDraft, photo: AgeKycPickedPhoto): AgeKycDraft {
  draft = { ...draft, [slot]: photo };
  return { ...draft };
}

export function clearAgeKycDraft(): void {
  draft = { ...empty };
}
