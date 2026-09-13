import { Platform } from "react-native";
import type { AgeKycDocumentType } from "@/lib/age-kyc-policy";
import type { AgeKycPickedPhoto } from "@/lib/age-kyc-photo-helpers";
import { getTrpcApiUrl } from "@/lib/trpc-url";
import {
  ageKycDocumentUrlFromTrpc,
  ageKycPrecheckUrlFromTrpc,
  ageKycSelfieMatchUrlFromTrpc,
} from "@/lib/age-kyc-precheck-url";

export type AgeKycFastPrecheckResult = {
  verified: boolean;
  rejectionReason: string | null;
  passToken: string | null;
};

export type AgeKycDocumentCheckClientResult = {
  verified: boolean;
  rejectionReason: string | null;
  documentToken: string | null;
  issuer: string | null;
};

/** Phone uploads must not spin forever. Keep the photos and let them tap Check again. */
export const AGE_KYC_FAST_PRECHECK_TIMEOUT_MS = 40_000;

function bytesFromBase64(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const BufferCtor = (globalThis as { Buffer?: { from: (value: string, enc: string) => Uint8Array } }).Buffer;
  if (BufferCtor) return new Uint8Array(BufferCtor.from(base64, "base64"));
  throw new Error("Could not read that photo. Try again.");
}

function photoToBlob(photo: AgeKycPickedPhoto): Blob {
  const bytes = bytesFromBase64(photo.base64);
  return new Blob([bytes], { type: photo.mimeType || "image/jpeg" });
}

/** Stripe/Onfido-style: send JPEG bytes, not a giant JSON string. */
export async function fastPrecheckAgeKyc(params: {
  documentType: AgeKycDocumentType;
  idFront: AgeKycPickedPhoto;
  idBack: AgeKycPickedPhoto;
  selfie: AgeKycPickedPhoto;
  turnstileToken?: string;
}): Promise<AgeKycFastPrecheckResult> {
  const body = new FormData();
  body.append("documentType", params.documentType);
  if (params.turnstileToken) body.append("turnstileToken", params.turnstileToken);

  if (Platform.OS === "web" && typeof Blob !== "undefined") {
    body.append("idFront", photoToBlob(params.idFront), "front.jpg");
    body.append("idBack", photoToBlob(params.idBack), "back.jpg");
    body.append("selfie", photoToBlob(params.selfie), "selfie.jpg");
  } else {
    const appendNative = (field: string, photo: AgeKycPickedPhoto, name: string) => {
      const localUri =
        photo.previewUri.startsWith("file:") || photo.previewUri.startsWith("content:")
          ? photo.previewUri
          : `data:${photo.mimeType || "image/jpeg"};base64,${photo.base64}`;
      body.append(field, {
        uri: localUri,
        type: photo.mimeType || "image/jpeg",
        name,
      } as unknown as Blob);
    };
    appendNative("idFront", params.idFront, "front.jpg");
    appendNative("idBack", params.idBack, "back.jpg");
    appendNative("selfie", params.selfie, "selfie.jpg");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGE_KYC_FAST_PRECHECK_TIMEOUT_MS);
  try {
    const response = await fetch(ageKycPrecheckUrlFromTrpc(getTrpcApiUrl()), {
      method: "POST",
      body,
      credentials: "include",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as
      | (AgeKycFastPrecheckResult & { error?: string })
      | null;
    if (!data) {
      throw new Error("Unable to transfer response from server");
    }
    if (!response.ok && data.error) {
      throw new Error(data.error);
    }
    return {
      verified: data.verified === true,
      rejectionReason: data.rejectionReason ?? null,
      passToken: data.passToken ?? null,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || raw.toLowerCase().includes("abort")) {
      throw new Error(
        "The picture check did not finish. Keep the three pictures and tap Check my three pictures again.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function postAgeKycForm(url: string, body: FormData): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGE_KYC_FAST_PRECHECK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      body,
      credentials: "include",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data) throw new Error("Unable to transfer response from server");
    if (!response.ok && typeof data.error === "string") {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || raw.toLowerCase().includes("abort")) {
      throw new Error("The picture check did not finish. Keep the pictures and tap Check again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function appendPhoto(body: FormData, field: string, photo: AgeKycPickedPhoto, name: string): void {
  if (Platform.OS === "web" && typeof Blob !== "undefined") {
    body.append(field, photoToBlob(photo), name);
    return;
  }
  const localUri =
    photo.previewUri.startsWith("file:") || photo.previewUri.startsWith("content:")
      ? photo.previewUri
      : `data:${photo.mimeType || "image/jpeg"};base64,${photo.base64}`;
  body.append(field, {
    uri: localUri,
    type: photo.mimeType || "image/jpeg",
    name,
  } as unknown as Blob);
}

/** Step 1 — Stripe / Onfido document check. Front and back only. */
export async function fastCheckIdDocument(params: {
  documentType: AgeKycDocumentType;
  idFront: AgeKycPickedPhoto;
  idBack: AgeKycPickedPhoto;
  turnstileToken?: string;
}): Promise<AgeKycDocumentCheckClientResult> {
  const body = new FormData();
  body.append("documentType", params.documentType);
  if (params.turnstileToken) body.append("turnstileToken", params.turnstileToken);
  appendPhoto(body, "idFront", params.idFront, "front.jpg");
  appendPhoto(body, "idBack", params.idBack, "back.jpg");
  const data = await postAgeKycForm(ageKycDocumentUrlFromTrpc(getTrpcApiUrl()), body);
  return {
    verified: data.verified === true,
    rejectionReason: typeof data.rejectionReason === "string" ? data.rejectionReason : null,
    documentToken: typeof data.documentToken === "string" ? data.documentToken : null,
    issuer: typeof data.issuer === "string" ? data.issuer : null,
  };
}

/** Step 2 — Face match only. The ID was already verified. */
export async function fastCheckSelfieMatch(params: {
  documentToken: string;
  idFront: AgeKycPickedPhoto;
  selfie: AgeKycPickedPhoto;
  turnstileToken?: string;
}): Promise<AgeKycFastPrecheckResult> {
  const body = new FormData();
  body.append("documentToken", params.documentToken);
  if (params.turnstileToken) body.append("turnstileToken", params.turnstileToken);
  appendPhoto(body, "idFront", params.idFront, "front.jpg");
  appendPhoto(body, "selfie", params.selfie, "selfie.jpg");
  const data = await postAgeKycForm(ageKycSelfieMatchUrlFromTrpc(getTrpcApiUrl()), body);
  return {
    verified: data.verified === true,
    rejectionReason: typeof data.rejectionReason === "string" ? data.rejectionReason : null,
    passToken: typeof data.passToken === "string" ? data.passToken : null,
  };
}
