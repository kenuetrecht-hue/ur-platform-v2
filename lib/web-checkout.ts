import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { getAppPublicBaseUrl } from "@/lib/app-handoff-url";
import { isAllowedCheckoutUrl } from "@/lib/checkout-url-policy";

export { isAllowedCheckoutUrl } from "@/lib/checkout-url-policy";

export function getClientPlatform(): "web" | "native" {
  return Platform.OS === "web" ? "web" : "native";
}

/** Open a web-only checkout destination from the native app. */
export async function openWebBrowserCheckout(path: string): Promise<void> {
  const base = getAppPublicBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  await openExternalCheckoutUrl(url);
}

/** Open Stripe Checkout or any absolute HTTPS payment URL. */
export async function openExternalCheckoutUrl(url: string): Promise<void> {
  if (!isAllowedCheckoutUrl(url)) {
    throw new Error("Checkout URL is not allowed.");
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
    return;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await WebBrowser.openBrowserAsync(url);
  } else {
    await Linking.openURL(url);
  }
}

export function buildAiSubscriptionWebPath(creatorId: string): string {
  return `/ai/${encodeURIComponent(creatorId)}?subscribe=1`;
}

export function buildTalkPackWebPath(packId: string): string {
  return `/(tabs)/ais?talkPack=${encodeURIComponent(packId)}`;
}
