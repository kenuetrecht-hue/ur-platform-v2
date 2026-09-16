/**
 * Website install path — visitors get UR from this site, not the stores.
 * iOS cannot legally sideload a consumer IPA from a US website.
 * Android can install the PWA via beforeinstallprompt, and a hosted .apk when present.
 */

import { PLATFORM_PUBLIC_ORIGIN } from "@/lib/platform-urls";

export const APP_DOWNLOAD_PATH = "/download";
export const ANDROID_APK_PUBLIC_PATH = "/downloads/ur.apk";
export const ANDROID_APK_FILE_NAME = "ur.apk";

export const IPHONE_DOWNLOAD_LABEL = "iPhone download";
export const ANDROID_DOWNLOAD_LABEL = "Android download";
export const COMPUTER_DOWNLOAD_LABEL = "Computer download";

export const APP_DOWNLOAD_HEADLINE = "Get the UR app from this website";

export const APP_DOWNLOAD_LEDE =
  "Install UR here. You do not need the Apple App Store or Google Play.";

export const APP_DOWNLOAD_NO_STORE_LINE =
  "You do not need the Apple App Store or Google Play to get UR from this website.";

export const IOS_NATIVE_NOTE =
  "Apple does not let US phones install a native iPhone app from a website file.";

export const ANDROID_APK_NOTE =
  "If you download the Android installer file, your phone may ask you to allow installs from this site.";

export const APP_ALREADY_INSTALLED = "UR is already installed on this device.";

export type WebInstallSurface = "ios" | "android" | "desktop";

export type AppDownloadSummary = {
  storeRequired: false;
  primaryChannel: "website-pwa";
  androidApkAvailable: boolean;
  iosNativeSideloadAvailable: false;
};

export type InstallPlan = "prompt" | "apk" | "share" | "already" | "unavailable";

export function isSafeHttpDownloadUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isSafeRelativeDownloadPath(raw: string): boolean {
  if (!raw.startsWith("/") || raw.startsWith("//")) return false;
  if (raw.includes("\\") || raw.includes("..")) return false;
  return /^\/downloads\/[A-Za-z0-9._-]+\.(apk|aab)$/i.test(raw);
}

/** Android .apk hosted by UR — same-origin slot, or EXPO_PUBLIC_ANDROID_APK_URL. */
export function getAndroidApkDownloadUrl(
  raw = process.env.EXPO_PUBLIC_ANDROID_APK_URL,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return ANDROID_APK_PUBLIC_PATH;
  if (isSafeRelativeDownloadPath(trimmed)) return trimmed;
  if (!isSafeHttpDownloadUrl(trimmed)) return null;
  return new URL(trimmed).toString();
}

export function absoluteAndroidApkUrl(
  apkUrl: string | null,
  origin = PLATFORM_PUBLIC_ORIGIN,
): string | null {
  if (!apkUrl) return null;
  if (isSafeHttpDownloadUrl(apkUrl)) return apkUrl;
  if (isSafeRelativeDownloadPath(apkUrl)) {
    return `${origin.replace(/\/+$/, "")}${apkUrl}`;
  }
  return null;
}

export function detectWebInstallSurface(userAgent: string): WebInstallSurface {
  const ua = userAgent.toLowerCase();
  const iosDevice = /iphone|ipad|ipod/.test(ua);
  const iosIpadOs = ua.includes("macintosh") && ua.includes("mobile");
  if (iosDevice || iosIpadOs) return "ios";
  if (ua.includes("android")) return "android";
  return "desktop";
}

export function downloadPathForSurface(surface: WebInstallSurface): string {
  return `${APP_DOWNLOAD_PATH}?device=${surface}`;
}

export function parseDownloadDeviceParam(
  raw: string | string[] | undefined | null,
): WebInstallSurface | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "ios" || value === "android" || value === "desktop") return value;
  return null;
}

export function chooseInstallPlan(args: {
  surface: WebInstallSurface;
  hasDeferredPrompt: boolean;
  apkUrl: string | null;
  standalone: boolean;
  canShare: boolean;
}): InstallPlan {
  if (args.standalone) return "already";
  if (args.surface === "android") {
    if (args.hasDeferredPrompt) return "prompt";
    if (args.apkUrl) return "apk";
    return "unavailable";
  }
  if (args.surface === "ios") {
    if (args.hasDeferredPrompt) return "prompt";
    if (args.canShare) return "share";
    return "unavailable";
  }
  if (args.hasDeferredPrompt) return "prompt";
  return "unavailable";
}

export function buildAppDownloadSummary(apkUrl: string | null): AppDownloadSummary {
  return {
    storeRequired: false,
    primaryChannel: "website-pwa",
    androidApkAvailable: Boolean(apkUrl),
    iosNativeSideloadAvailable: false,
  };
}
