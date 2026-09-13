export type AgeKycWizardStep = "front" | "back" | "selfie" | "review";
export type AgeKycIdWizardStep = "front" | "back" | "id-ready";
export type AgeKycSelfieWizardStep = "selfie" | "review";
export type AgeKycCapturePhase = "id" | "selfie";

export const AGE_KYC_WIZARD_STEPS: AgeKycWizardStep[] = ["front", "back", "selfie", "review"];

/** Stripe / Onfido style: ID page first, then a separate selfie page, then review. */
export function nextAgeKycIdWizardStep(step: "front" | "back"): AgeKycIdWizardStep {
  return step === "front" ? "back" : "id-ready";
}

export function nextAgeKycSelfieWizardStep(_step: "selfie"): AgeKycSelfieWizardStep {
  return "review";
}

/** Conceptual three-picture order (ID page owns front/back; selfie page owns the rest). */
export function nextAgeKycWizardStep(step: AgeKycWizardStep): AgeKycWizardStep {
  if (step === "front") return "back";
  if (step === "back") return "selfie";
  return "review";
}

export function ageKycWizardTitle(step: AgeKycWizardStep | AgeKycIdWizardStep): string {
  if (step === "front") return "ID page — front";
  if (step === "back") return "ID page — back";
  if (step === "id-ready") return "ID pictures ready";
  if (step === "selfie") return "Selfie page";
  return "Review your ID and selfie";
}

export function canContinueToSelfiePage(draft: { front: unknown; back: unknown }): boolean {
  return Boolean(draft.front && draft.back);
}

/** After the ID itself passed — not just that photos exist. */
export function canOpenSelfieAfterIdCheck(params: {
  front: unknown;
  back: unknown;
  documentChecked: boolean;
}): boolean {
  return Boolean(params.front && params.back && params.documentChecked);
}

export function canOpenPictureReview(draft: { front: unknown; back: unknown; selfie: unknown }): boolean {
  return Boolean(draft.front && draft.back && draft.selfie);
}

export function initialAgeKycIdStep(draft: { front: unknown; back: unknown }): AgeKycIdWizardStep {
  if (!draft.front) return "front";
  if (!draft.back) return "back";
  return "id-ready";
}

export function initialAgeKycSelfieStep(draft: { selfie: unknown }): AgeKycSelfieWizardStep {
  return draft.selfie ? "review" : "selfie";
}
