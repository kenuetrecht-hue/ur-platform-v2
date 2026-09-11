import { Platform } from "react-native";
import { type AgeKycMimeType } from "./age-kyc-policy";
import {
  ageKycWebCapture,
  isAllowedAgeKycMime,
  readFileAsPhoto,
  type AgeKycPickedPhoto,
} from "./age-kyc-photo-helpers";

export {
  ageKycWebCapture,
  countFilledAgeKycSlots,
  photoFromDataUrl,
  readFileAsPhoto,
  type AgeKycPickedPhoto,
} from "./age-kyc-photo-helpers";

async function pickOnWeb(kind: "id" | "selfie" | "library"): Promise<AgeKycPickedPhoto | null> {
  if (typeof document === "undefined") return null;
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    const capture = ageKycWebCapture(kind);
    if (capture) input.setAttribute("capture", capture);
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

function photoFromAsset(
  asset: { mimeType?: string | null; base64?: string | null; uri: string },
): AgeKycPickedPhoto {
  if (!asset.base64) {
    throw new Error("Could not read that photo. Try again.");
  }
  const mimeType = (asset.mimeType ?? "image/jpeg") as AgeKycMimeType;
  if (!isAllowedAgeKycMime(mimeType)) {
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
