import { describe, expect, it } from "vitest";
import {
  ANDROID_APK_PUBLIC_PATH,
  APP_DOWNLOAD_LEDE,
  APP_DOWNLOAD_NO_STORE_LINE,
  APP_DOWNLOAD_PATH,
  IOS_NATIVE_NOTE,
  absoluteAndroidApkUrl,
  buildAppDownloadSummary,
  chooseInstallPlan,
  detectWebInstallSurface,
  downloadPathForSurface,
  parseDownloadDeviceParam,
  getAndroidApkDownloadUrl,
  isSafeHttpDownloadUrl,
  isSafeRelativeDownloadPath,
} from "../lib/app-download";
import { readFileSync } from "fs";

describe("app website download", () => {
  it("sends visitors to /download and does not require the stores", () => {
    expect(APP_DOWNLOAD_PATH).toBe("/download");
    expect(APP_DOWNLOAD_LEDE).toMatch(/do not need the Apple App Store or Google Play/i);
    expect(APP_DOWNLOAD_NO_STORE_LINE).toMatch(/do not need the Apple App Store or Google Play/i);
    expect(buildAppDownloadSummary(null)).toEqual({
      storeRequired: false,
      primaryChannel: "website-pwa",
      androidApkAvailable: false,
      iosNativeSideloadAvailable: false,
    });
    expect(buildAppDownloadSummary("https://urplatform.llc/downloads/ur.apk").androidApkAvailable).toBe(
      true,
    );
  });

  it("does not use App Store or Play Store as the install path", () => {
    expect(IOS_NATIVE_NOTE).toMatch(/does not let US phones install a native iPhone app from a website/i);
    expect(IOS_NATIVE_NOTE).not.toMatch(/open the App Store/i);
  });

  it("detects phone surfaces from the browser user agent", () => {
    expect(detectWebInstallSurface("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      "ios",
    );
    expect(detectWebInstallSurface("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
    expect(detectWebInstallSurface("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });

  it("only accepts a real http(s) or /downloads Android installer URL", () => {
    expect(isSafeHttpDownloadUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpDownloadUrl("https://urplatform.llc/downloads/ur.apk")).toBe(true);
    expect(isSafeRelativeDownloadPath("/downloads/ur.apk")).toBe(true);
    expect(isSafeRelativeDownloadPath("/etc/passwd")).toBe(false);
    expect(isSafeRelativeDownloadPath("/downloads/../ur.apk")).toBe(false);
    expect(getAndroidApkDownloadUrl("")).toBe(ANDROID_APK_PUBLIC_PATH);
    expect(getAndroidApkDownloadUrl("   ")).toBe(ANDROID_APK_PUBLIC_PATH);
    expect(getAndroidApkDownloadUrl("javascript:alert(1)")).toBeNull();
    expect(getAndroidApkDownloadUrl("https://urplatform.llc/downloads/ur.apk")).toBe(
      "https://urplatform.llc/downloads/ur.apk",
    );
    expect(getAndroidApkDownloadUrl("/downloads/ur.apk")).toBe("/downloads/ur.apk");
    expect(absoluteAndroidApkUrl("/downloads/ur.apk", "https://urplatform.llc")).toBe(
      "https://urplatform.llc/downloads/ur.apk",
    );
  });

  it("builds iPhone, Android, and computer download links", () => {
    expect(downloadPathForSurface("ios")).toBe("/download?device=ios");
    expect(downloadPathForSurface("android")).toBe("/download?device=android");
    expect(downloadPathForSurface("desktop")).toBe("/download?device=desktop");
    expect(parseDownloadDeviceParam("ios")).toBe("ios");
    expect(parseDownloadDeviceParam("nope")).toBeNull();
  });

  it("chooses a real install action, not a tutorial", () => {
    expect(
      chooseInstallPlan({
        surface: "android",
        hasDeferredPrompt: true,
        apkUrl: "/downloads/ur.apk",
        standalone: false,
        canShare: false,
      }),
    ).toBe("prompt");
    expect(
      chooseInstallPlan({
        surface: "android",
        hasDeferredPrompt: false,
        apkUrl: "/downloads/ur.apk",
        standalone: false,
        canShare: false,
      }),
    ).toBe("apk");
    expect(
      chooseInstallPlan({
        surface: "ios",
        hasDeferredPrompt: false,
        apkUrl: null,
        standalone: false,
        canShare: true,
      }),
    ).toBe("share");
    expect(
      chooseInstallPlan({
        surface: "desktop",
        hasDeferredPrompt: true,
        apkUrl: null,
        standalone: false,
        canShare: false,
      }),
    ).toBe("prompt");
  });

  it("keeps Login download buttons as install actions, not numbered how-to", () => {
    const login = readFileSync("app/(auth)/login.tsx", "utf8");
    const buttons = readFileSync("components/landing/landing-app-download-link.tsx", "utf8");
    expect(login).toContain("LandingDeviceDownloadLinks");
    expect(buttons).toContain("IPHONE_DOWNLOAD_LABEL");
    expect(buttons).toContain("ANDROID_DOWNLOAD_LABEL");
    expect(buttons).toContain("install(item.surface)");
    expect(buttons).not.toContain("Open this site in Safari");
    expect(buttons).not.toContain("Tap the Share button");
    expect(buttons).not.toContain("Add to Home Screen, then Add");
    expect(login).not.toContain("IOS_ADD_TO_HOME_STEPS");
    expect(login).not.toContain("Open this site in Safari");
  });
});
