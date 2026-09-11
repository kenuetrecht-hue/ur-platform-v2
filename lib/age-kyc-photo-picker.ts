import { Platform } from "react-native";
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

function isAllowedMime(mime: string): mime is AgeKycMimeType {
  return AGE_KYC_MIME_TYPES.includes(mime as AgeKycMimeType);
}

export function countFilledAgeKycSlots(slots: {
  front: AgeKycPickedPhoto | null;
  back: AgeKycPickedPhoto | null;
  selfie: AgeKycPickedPhoto | null;
}): number {
  return Number(Boolean(slots.front)) + Number(Boolean(slots.back)) + Number(Boolean(slots.selfie));
}

export function readFileAsPhoto(file: File): Promise<AgeKycPickedPhoto> {
  return new Promise((resolve, reject) => {
    if (file.size > AGE_KYC_IMAGE_MAX_BYTES) {
      reject(new Error("Photo is too large (max 4 MB)."));
      return;
    }
    const mimeType = file.type || "image/jpeg";
    if (!isAllowedMime(mimeType)) {
      reject(new Error("Use a JPEG, PNG, or WebP photo."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({
        mimeType,
        base64,
        previewUri: result.startsWith("data:") ? result : `data:${mimeType};base64,${base64}`,
      });
    };
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(file);
  });
}

async function pickOnWeb(kind: "id" | "selfie" | "library"): Promise<AgeKycPickedPhoto | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    if (kind === "selfie") input.capture = "user";
    if (kind === "id") input.capture = "environment";
    // iOS ignores click() on display:none inputs — keep it on-screen but invisible.
    input.setAttribute("aria-hidden", "true");
    Object.assign(input.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      zIndex: "1",
    });
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await readFileAsPhoto(file));
      } catch (error) {
        reject(error);
      }
    };
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });
}

export function photoFromDataUrl(dataUrl: string): AgeKycPickedPhoto {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "data:image/jpeg;base64";
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mimeMatch = header.match(/data:(image\/[a-z0-9.+-]+)/i);
  const mimeType = (mimeMatch?.[1] ?? "image/jpeg").toLowerCase();
  if (!isAllowedMime(mimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  if (bytes > AGE_KYC_IMAGE_MAX_BYTES) {
    throw new Error("Photo is too large (max 4 MB).");
  }
  return {
    mimeType,
    base64,
    previewUri: dataUrl.startsWith("data:") ? dataUrl : `data:${mimeType};base64,${base64}`,
  };
}

function photoFromAsset(
  asset: { mimeType?: string | null; base64?: string | null; uri: string },
): AgeKycPickedPhoto {
  if (!asset.base64) {
    throw new Error("Could not read that photo. Try again.");
  }
  const mimeType = (asset.mimeType ?? "image/jpeg") as AgeKycMimeType;
  if (!isAllowedMime(mimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }
  return {
    mimeType,
    base64: asset.base64,
    previewUri: asset.uri.startsWith("data:") ? asset.uri : `data:${mimeType};base64,${asset.base64}`,
  };
}

/** Photo already on the phone or computer. */
export async function pickAgeKycLibraryPhoto(): Promise<AgeKycPickedPhoto | null> {
  if (Platform.OS === "web") {
    return pickOnWeb("library");
  }
  const ImagePicker = await import("expo-image-picker");
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!lib.granted) {
    throw new Error("Photo library permission is required to use a saved picture.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    base64: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  return photoFromAsset(result.assets[0]);
}

/** ID: camera or library. Selfie: front camera when possible. */
export async function pickAgeKycPhoto(kind: "id" | "selfie"): Promise<AgeKycPickedPhoto | null> {
  if (Platform.OS === "web") {
    return pickOnWeb(kind);
  }

  const ImagePicker = await import("expo-image-picker");
  if (kind === "selfie") {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      throw new Error("Camera permission is required for the selfie.");
    }
    const shot = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (shot.canceled || !shot.assets[0]) return null;
    return photoFromAsset(shot.assets[0]);
  }

  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  if (!lib.granted && !cam.granted) {
    throw new Error("Camera or photo library permission is required for the ID.");
  }

  const result = cam.granted
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
        cameraType: ImagePicker.CameraType.back,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });

  if (result.canceled || !result.assets[0]) return null;
  return photoFromAsset(result.assets[0]);
}
