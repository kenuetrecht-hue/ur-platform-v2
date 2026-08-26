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

function readFileAsPhoto(file: File): Promise<AgeKycPickedPhoto> {
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

async function pickOnWeb(kind: "id" | "selfie"): Promise<AgeKycPickedPhoto | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.capture = kind === "selfie" ? "user" : "environment";
    input.style.display = "none";
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
    if (shot.canceled || !shot.assets[0]?.base64) return null;
    const asset = shot.assets[0];
    const mimeType = (asset.mimeType ?? "image/jpeg") as AgeKycMimeType;
    if (!isAllowedMime(mimeType)) {
      throw new Error("Use a JPEG, PNG, or WebP photo.");
    }
    return {
      mimeType,
      base64: asset.base64,
      previewUri: asset.uri,
    };
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

  if (result.canceled || !result.assets[0]?.base64) return null;
  const asset = result.assets[0];
  const mimeType = (asset.mimeType ?? "image/jpeg") as AgeKycMimeType;
  if (!isAllowedMime(mimeType)) {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }
  return {
    mimeType,
    base64: asset.base64,
    previewUri: asset.uri,
  };
}
