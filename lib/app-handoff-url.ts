import { Platform } from "react-native";

const bundleId = "space.manus.ur.creator.platform.t20260430224643";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
export const APP_DEEP_LINK_SCHEME = `manus${timestamp}`;

/** Public HTTPS URL for QR codes (opens web handoff → signup on mobile). */
export function getAppPublicBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "https://urplatform.app";
}

export function buildHandoffUrl(token: string): string {
  return `${getAppPublicBaseUrl()}/handoff?token=${encodeURIComponent(token)}`;
}

export function buildHandoffDeepLink(token: string): string {
  return `${APP_DEEP_LINK_SCHEME}://handoff?token=${encodeURIComponent(token)}`;
}
