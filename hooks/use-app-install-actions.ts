import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Share } from "react-native";
import {
  ANDROID_APK_FILE_NAME,
  absoluteAndroidApkUrl,
  chooseInstallPlan,
  getAndroidApkDownloadUrl,
  type InstallPlan,
  type WebInstallSurface,
} from "@/lib/app-download";
import { getPlatformPublicOrigin } from "@/lib/platform-urls";
import {
  captureWebInstallPrompt,
  clearCapturedInstallPrompt,
  getCapturedInstallPrompt,
  isWebAppInstalled,
  subscribeWebInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/web-install-prompt";

export type InstallActionResult = InstallPlan | "accepted" | "dismissed";

function pageOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return getPlatformPublicOrigin();
}

function canShareHere(): boolean {
  if (Platform.OS === "ios" || Platform.OS === "android") return true;
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") return true;
  return false;
}

async function promptPwaInstall(event: BeforeInstallPromptEvent): Promise<"accepted" | "dismissed"> {
  await event.prompt();
  const choice = await event.userChoice;
  clearCapturedInstallPrompt();
  return choice.outcome;
}

function downloadApk(apkUrl: string): void {
  const abs = absoluteAndroidApkUrl(apkUrl, pageOrigin()) ?? apkUrl;
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const link = document.createElement("a");
    link.href = abs;
    link.setAttribute("download", ANDROID_APK_FILE_NAME);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  void Linking.openURL(abs);
}

async function shareInstallUrl(): Promise<boolean> {
  const url = `${pageOrigin()}/`;
  try {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "UR", url });
      return true;
    }
    const result = await Share.share(Platform.OS === "ios" ? { url } : { message: url, url });
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

export function useAppInstallActions() {
  const apkUrl = useMemo(() => getAndroidApkDownloadUrl(), []);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [failedSurface, setFailedSurface] = useState<WebInstallSurface | null>(null);

  useEffect(() => {
    captureWebInstallPrompt();
    setDeferred(getCapturedInstallPrompt());
    setStandalone(isWebAppInstalled());
    return subscribeWebInstallPrompt(() => {
      setDeferred(getCapturedInstallPrompt());
      setStandalone(isWebAppInstalled());
    });
  }, []);

  const planFor = useCallback(
    (surface: WebInstallSurface): InstallPlan =>
      chooseInstallPlan({
        surface,
        hasDeferredPrompt: Boolean(deferred),
        apkUrl,
        standalone,
        canShare: canShareHere(),
      }),
    [apkUrl, deferred, standalone],
  );

  const install = useCallback(
    async (surface: WebInstallSurface): Promise<InstallActionResult> => {
      setFailedSurface(null);
      const plan = chooseInstallPlan({
        surface,
        hasDeferredPrompt: Boolean(deferred),
        apkUrl,
        standalone,
        canShare: canShareHere(),
      });

      if (plan === "already") return "already";

      if (plan === "prompt" && deferred) {
        const outcome = await promptPwaInstall(deferred);
        setDeferred(null);
        return outcome;
      }

      if (plan === "apk" && apkUrl) {
        downloadApk(apkUrl);
        return "apk";
      }

      if (plan === "share" || (surface === "ios" && plan !== "prompt")) {
        const shared = await shareInstallUrl();
        if (shared) return "share";
        setFailedSurface("ios");
        return "unavailable";
      }

      setFailedSurface(surface);
      return "unavailable";
    },
    [apkUrl, deferred, standalone],
  );

  return {
    apkUrl,
    standalone,
    hasDeferredPrompt: Boolean(deferred),
    failedSurface,
    planFor,
    install,
  };
}
