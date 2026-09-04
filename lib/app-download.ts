/**
 * Website install path — visitors get UR from this site, not the stores.
 * iOS cannot legally sideload a consumer IPA from a US website; Add to Home Screen is the store-free path.
 * Android can also take a hosted .apk when EXPO_PUBLIC_ANDROID_APK_URL is set.
 */

export const APP_DOWNLOAD_PATH = "/download";

export const APP_DOWNLOAD_HEADLINE = "Get the UR app from this website";

export const APP_DOWNLOAD_LEDE =
  "Install UR here. You do not need the Apple App Store or Google Play.";

export const APP_DOWNLOAD_NO_STORE_LINE =
  "You do not need the Apple App Store or Google Play to get UR from this website.";

export const IOS_ADD_TO_HOME_STEPS = [
  "Open this site in Safari on your iPhone or iPad.",
  "Tap the Share button (the square with an arrow).",
  "Tap Add to Home Screen, then Add.",
] as const;

export const ANDROID_ADD_TO_HOME_STEPS = [
  "Open this site in Chrome on your Android phone.",
  "Tap Install or Add to Home screen when the prompt appears.",
  "Or tap the browser menu (⋮) and choose Install app or Add to Home screen.",
] as const;

export const DESKTOP_INSTALL_STEPS = [
  "In Chrome or Edge, use Install UR in the address bar, or tap the button on this page.",
  "UR opens in its own window — no store visit required.",
] as const;

export const IOS_NATIVE_NOTE =
  "Apple does not let US phones install a native iPhone app from a website file. The home-screen install above is the store-free iPhone path. It is the same UR website, with an icon on your home screen.";

export const ANDROID_APK_NOTE =
  "If you download the Android installer file, your phone may ask you to allow installs from this site. That is normal for a website download — you are not being sent to Google Play.";

export type WebInstallSurface = "ios" | "android" | "desktop";

export type AppDownloadSummary = {
  storeRequired: false;
  primaryChannel: "website-pwa";
  androidApkAvailable: boolean;
  iosNativeSideloadAvailable: false;
};

export function isSafeHttpDownloadUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Optional Android .apk / .aab hosted by UR — empty until a build is uploaded. */
export function getAndroidApkDownloadUrl(
  raw = process.env.EXPO_PUBLIC_ANDROID_APK_URL,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (!isSafeHttpDownloadUrl(trimmed)) return null;
  return new URL(trimmed).toString();
}

export function detectWebInstallSurface(userAgent: string): WebInstallSurface {
  const ua = userAgent.toLowerCase();
  const iosDevice = /iphone|ipad|ipod/.test(ua);
  const iosIpadOs = ua.includes("macintosh") && ua.includes("mobile");
  if (iosDevice || iosIpadOs) return "ios";
  if (ua.includes("android")) return "android";
  return "desktop";
}

export function installStepsForSurface(surface: WebInstallSurface): readonly string[] {
  if (surface === "ios") return IOS_ADD_TO_HOME_STEPS;
  if (surface === "android") return ANDROID_ADD_TO_HOME_STEPS;
  return DESKTOP_INSTALL_STEPS;
}

export function buildAppDownloadSummary(apkUrl: string | null): AppDownloadSummary {
  return {
    storeRequired: false,
    primaryChannel: "website-pwa",
    androidApkAvailable: Boolean(apkUrl),
    iosNativeSideloadAvailable: false,
  };
}
