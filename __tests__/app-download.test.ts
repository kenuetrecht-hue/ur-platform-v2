import { describe, expect, it } from "vitest";
import {
  ANDROID_ADD_TO_HOME_STEPS,
  APP_DOWNLOAD_LEDE,
  APP_DOWNLOAD_NO_STORE_LINE,
  APP_DOWNLOAD_PATH,
  DESKTOP_INSTALL_STEPS,
  IOS_ADD_TO_HOME_STEPS,
  IOS_NATIVE_NOTE,
  buildAppDownloadSummary,
  detectWebInstallSurface,
  getAndroidApkDownloadUrl,
  installStepsForSurface,
  isSafeHttpDownloadUrl,
} from "../lib/app-download";

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

  it("teaches store-free home-screen install, not a store listing", () => {
    const allSteps = [
      ...IOS_ADD_TO_HOME_STEPS,
      ...ANDROID_ADD_TO_HOME_STEPS,
      ...DESKTOP_INSTALL_STEPS,
    ].join(" ");
    expect(allSteps).toMatch(/Add to Home Screen/i);
    expect(allSteps).toMatch(/Safari/i);
    expect(allSteps).toMatch(/Chrome/i);
    expect(allSteps).not.toMatch(/open the App Store/i);
    expect(allSteps).not.toMatch(/open Google Play/i);
    expect(IOS_NATIVE_NOTE).toMatch(/does not let US phones install a native iPhone app from a website/i);
  });

  it("detects phone surfaces from the browser user agent", () => {
    expect(detectWebInstallSurface("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(
      "ios",
    );
    expect(detectWebInstallSurface("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
    expect(detectWebInstallSurface("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(installStepsForSurface("ios")[2]).toMatch(/Add to Home Screen/i);
  });

  it("only accepts a real http(s) Android installer URL", () => {
    expect(isSafeHttpDownloadUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpDownloadUrl("https://urplatform.llc/downloads/ur.apk")).toBe(true);
    expect(getAndroidApkDownloadUrl("")).toBeNull();
    expect(getAndroidApkDownloadUrl("   ")).toBeNull();
    expect(getAndroidApkDownloadUrl("javascript:alert(1)")).toBeNull();
    expect(getAndroidApkDownloadUrl("https://urplatform.llc/downloads/ur.apk")).toBe(
      "https://urplatform.llc/downloads/ur.apk",
    );
  });
});
