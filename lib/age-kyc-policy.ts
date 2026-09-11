/**
 * Mandatory 18+ identity gate — everyone must pass before entering the app or website product.
 * Under-18 access is refused because of addictive product design (AI, social, payments).
 */

export const AGE_KYC_MIN_AGE = 18;

export const AGE_KYC_REQUIRED_MESSAGE =
  "UR Platform is for adults 18 and older. Take a photo of a government ID (front and back) and a selfie that matches the ID. You cannot enter until this check passes.";

export const AGE_KYC_UNDERAGE_MESSAGE =
  "You must be 18 or older to use UR Platform. Accounts that fail this check cannot enter.";

export const AGE_KYC_MISMATCH_MESSAGE =
  "The selfie does not match the photo on the ID. Use your own government ID and a live selfie of your face.";

export const AGE_KYC_ID_UNREADABLE_MESSAGE =
  "We could not read a valid government ID. Photograph the front and back in clear light, with all four corners visible.";

export const AGE_KYC_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export const AGE_KYC_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AgeKycMimeType = (typeof AGE_KYC_MIME_TYPES)[number];

export type AgeKycStatus = "none" | "pending" | "verified" | "rejected";

export type AgeKycDocumentType = "driver_license" | "state_id" | "passport" | "national_id";

/** Pull the first readable date out of model text or JSON. */
export function findFlexibleDobInText(value: string): string | null {
  const iso = value.match(/\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (iso) return parseFlexibleDob(iso[0]);
  const us = value.match(/\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-]((?:19|20)\d{2})\b/);
  if (us) return parseFlexibleDob(us[0]);
  return null;
}

/** Accept YYYY-MM-DD or common US printed dates such as 05/20/1990. */
export function parseFlexibleDob(value: string): string | null {
  const trimmed = value.trim();
  const iso = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!us) return null;
  const month = Number(us[1]);
  const day = Number(us[2]);
  const year = Number(us[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ageFromIsoDate(iso: string, now: Date = new Date()): number | null {
  const normalized = parseFlexibleDob(iso);
  const match = normalized ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > now.getUTCFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const birth = Date.UTC(year, month - 1, day);
  if (Number.isNaN(birth)) return null;

  let age = now.getUTCFullYear() - year;
  const monthNow = now.getUTCMonth() + 1;
  const dayNow = now.getUTCDate();
  if (monthNow < month || (monthNow === month && dayNow < day)) {
    age -= 1;
  }
  return age;
}

export function isAdultAge(age: number | null): boolean {
  return age != null && age >= AGE_KYC_MIN_AGE;
}
