import { useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ANDROID_APK_NOTE,
  ANDROID_ADD_TO_HOME_STEPS,
  DESKTOP_INSTALL_STEPS,
  IOS_ADD_TO_HOME_STEPS,
  IOS_NATIVE_NOTE,
  detectWebInstallSurface,
  getAndroidApkDownloadUrl,
  installStepsForSurface,
  type WebInstallSurface,
} from "@/lib/app-download";
import { LANDING_THEME as T } from "@/lib/landing-theme";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(display-mode: standalone)");
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(media?.matches || iosStandalone);
}

export function PwaInstallControls() {
  const [surface, setSurface] = useState<WebInstallSurface>("desktop");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const apkUrl = useMemo(() => getAndroidApkDownloadUrl(), []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    setSurface(detectWebInstallSurface(window.navigator.userAgent));
    setStandalone(readStandalone());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const steps = installStepsForSurface(surface);
  const alreadyOnHomeScreen = standalone || installed;

  const handleInstall = () => {
    if (!deferred) return;
    void deferred.prompt().then(() => {
      void deferred.userChoice.finally(() => setDeferred(null));
    });
  };

  const handleApk = () => {
    if (!apkUrl) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(apkUrl);
      return;
    }
    void Linking.openURL(apkUrl);
  };

  return (
    <View style={styles.wrap}>
      {alreadyOnHomeScreen ? (
        <Text style={styles.ready}>UR is already installed on this device.</Text>
      ) : deferred ? (
        <Pressable
          onPress={handleInstall}
          style={styles.primary}
          accessibilityRole="button"
          accessibilityLabel="Install UR on this device"
        >
          <Text style={styles.primaryText}>Install UR on this device</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>
          Use the steps for your phone below. Chrome and Edge may also show an Install button in
          the address bar.
        </Text>
      )}

      {apkUrl ? (
        <Pressable
          onPress={handleApk}
          style={styles.secondary}
          accessibilityRole="link"
          accessibilityLabel="Download the Android installer"
        >
          <Text style={styles.secondaryText}>Download Android installer (.apk)</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTag}>{surfaceLabel(surface)}</Text>
        {steps.map((step, index) => (
          <Text key={step} style={styles.step}>
            {index + 1}. {step}
          </Text>
        ))}
        {surface === "ios" ? <Text style={styles.note}>{IOS_NATIVE_NOTE}</Text> : null}
        {surface === "android" && apkUrl ? <Text style={styles.note}>{ANDROID_APK_NOTE}</Text> : null}
      </View>

      {surface !== "ios" ? (
        <View style={styles.card}>
          <Text style={styles.cardTag}>iPhone / iPad</Text>
          {IOS_ADD_TO_HOME_STEPS.map((step, index) => (
            <Text key={step} style={styles.step}>
              {index + 1}. {step}
            </Text>
          ))}
          <Text style={styles.note}>{IOS_NATIVE_NOTE}</Text>
        </View>
      ) : null}

      {surface !== "android" ? (
        <View style={styles.card}>
          <Text style={styles.cardTag}>Android</Text>
          {ANDROID_ADD_TO_HOME_STEPS.map((step, index) => (
            <Text key={step} style={styles.step}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
      ) : null}

      {surface !== "desktop" ? (
        <View style={styles.card}>
          <Text style={styles.cardTag}>Computer</Text>
          {DESKTOP_INSTALL_STEPS.map((step, index) => (
            <Text key={step} style={styles.step}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function surfaceLabel(surface: WebInstallSurface): string {
  if (surface === "ios") return "Your iPhone / iPad";
  if (surface === "android") return "Your Android phone";
  return "This computer";
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 16 },
  ready: {
    color: T.success,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: { color: T.muted, fontSize: 14, lineHeight: 21 },
  primary: {
    backgroundColor: T.electric,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  primaryText: { color: "#001018", fontSize: 16, fontWeight: "900" },
  secondary: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null),
  },
  secondaryText: { color: T.electric, fontSize: 15, fontWeight: "800" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bgElevated,
    padding: 18,
    gap: 8,
  },
  cardTag: {
    color: T.electric,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  step: { color: T.text, fontSize: 14, lineHeight: 21 },
  note: { color: T.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
});
