import { Platform } from "react-native";
import type { AgeKycDocumentType } from "@/lib/age-kyc-policy";
import type { AgeKycPickedPhoto } from "@/lib/age-kyc-photo-helpers";
import { getTrpcApiUrl } from "@/lib/trpc-url";
import { ageKycPrecheckUrlFromTrpc } from "@/lib/age-kyc-precheck-url";

export type AgeKycFastPrecheckResult = {
  verified: boolean;
  rejectionReason: string | null;
  passToken: string | null;
};

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
      body.append(field, {
        uri: photo.previewUri,
        type: photo.mimeType || "image/jpeg",
        name,
      } as unknown as Blob);
    };
    appendNative("idFront", params.idFront, "front.jpg");
    appendNative("idBack", params.idBack, "back.jpg");
    appendNative("selfie", params.selfie, "selfie.jpg");
  }

  const response = await fetch(ageKycPrecheckUrlFromTrpc(getTrpcApiUrl()), {
    method: "POST",
    body,
    credentials: "include",
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
}
