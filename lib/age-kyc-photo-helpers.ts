import {
  AGE_KYC_IMAGE_MAX_BYTES,
  AGE_KYC_MIME_TYPES,
  type AgeKycMimeType,
} from "./age-kyc-policy";

export type AgeKycPickedPhoto = {
  mimeType: AgeKycMimeType;
  base64: string;
  previewUri: string;
};

export function isAllowedAgeKycMime(mime: string): mime is AgeKycMimeType {
  return AGE_KYC_MIME_TYPES.includes(mime as AgeKycMimeType);
}

/** Which phone camera the website should ask for. */
export function ageKycWebCapture(kind: "id" | "selfie" | "library"): "user" | "environment" | null {
  if (kind === "selfie") return "user";
  if (kind === "id") return "environment";
  return null;
}

export function countFilledAgeKycSlots(slots: {
  front: AgeKycPickedPhoto | null;
  back: AgeKycPickedPhoto | null;
  selfie: AgeKycPickedPhoto | null;
}): number {
  return Number(Boolean(slots.front)) + Number(Boolean(slots.back)) + Number(Boolean(slots.selfie));
}

export const AGE_KYC_SEND_MAX_EDGE = 1280;
export const AGE_KYC_SEND_QUALITY = 0.7;

function photoByteLength(base64: string): number {
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Shrink a camera shot so three pictures fit the ID-check request. */
export async function prepareAgeKycPhoto(photo: AgeKycPickedPhoto): Promise<AgeKycPickedPhoto> {
  if (typeof document === "undefined") return photo;
  const ImageCtor = typeof Image !== "undefined" ? Image : null;
  if (!ImageCtor) return photo;

  return new Promise((resolve) => {
    const img = new ImageCtor();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      const scale = longest > AGE_KYC_SEND_MAX_EDGE ? AGE_KYC_SEND_MAX_EDGE / longest : 1;
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(photo);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(photoFromDataUrl(canvas.toDataURL("image/jpeg", AGE_KYC_SEND_QUALITY)));
      } catch {
        resolve(photo);
      }
    };
    img.onerror = () => resolve(photo);
    img.src = photo.previewUri;
  });
}

export function readFileAsPhoto(file: File): Promise<AgeKycPickedPhoto> {
  return new Promise((resolve, reject) => {
    if (file.size > AGE_KYC_IMAGE_MAX_BYTES) {
      reject(new Error("Photo is too large (max 4 MB)."));
      return;
    }
    const mimeType = file.type || "image/jpeg";
    if (!isAllowedAgeKycMime(mimeType)) {
      reject(new Error("Use a JPEG, PNG, or WebP photo."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      const photo: AgeKycPickedPhoto = {
        mimeType,
        base64,
        previewUri: result.startsWith("data:") ? result : `data:${mimeType};base64,${base64}`,
      };
      void prepareAgeKycPhoto(photo).then(resolve, reject);
    };
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(file);
  });
}

export function photoFromDataUrl(dataUrl: string): AgeKycPickedPhoto {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "data:image/jpeg;base64";
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = header.match(/data:([^;,]+)/i);
  const mimeType = (mimeMatch?.[1] ?? "image/jpeg").toLowerCase();
  if (!isAllowedAgeKycMime(mimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }
  const bytes = photoByteLength(base64);
  if (bytes > AGE_KYC_IMAGE_MAX_BYTES) {
    throw new Error("Photo is too large (max 4 MB).");
  }
  return {
    mimeType,
    base64,
    previewUri: dataUrl.startsWith("data:") ? dataUrl : `data:${mimeType};base64,${base64}`,
  };
}
