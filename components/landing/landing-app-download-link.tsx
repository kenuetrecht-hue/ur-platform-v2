import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ANDROID_DOWNLOAD_LABEL,
  APP_ALREADY_INSTALLED,
  COMPUTER_DOWNLOAD_LABEL,
  IPHONE_DOWNLOAD_LABEL,
  IOS_NATIVE_NOTE,
  type WebInstallSurface,
} from "@/lib/app-download";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { useAppInstallActions } from "@/hooks/use-app-install-actions";

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null;

const SURFACES: { surface: WebInstallSurface; label: string }[] = [
  { surface: "ios", label: IPHONE_DOWNLOAD_LABEL },
  { surface: "android", label: ANDROID_DOWNLOAD_LABEL },
  { surface: "desktop", label: COMPUTER_DOWNLOAD_LABEL },
];

export function LandingAppDownloadLink({ variant }: { variant: "top" | "hero" | "footer" | "inline" }) {
  const { install, standalone } = useAppInstallActions();
  const label = variant === "top" ? "Download app" : "Download the app";
  const textStyle = {
    top: styles.topText,
    hero: styles.heroText,
    footer: styles.footerText,
    inline: styles.inlineText,
  }[variant];

  return (
    <Pressable
      onPress={() => {
        const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
        const surface: WebInstallSurface = /iphone|ipad|ipod/i.test(ua)
          ? "ios"
          : /android/i.test(ua)
            ? "android"
            : "desktop";
        void install(surface);
      }}
      style={styles[variant]}
      accessibilityRole="button"
      accessibilityLabel="Download the UR app from this website"
    >
      <Text style={textStyle}>{standalone ? APP_ALREADY_INSTALLED : label}</Text>
    </Pressable>
  );
}

export function LandingDeviceDownloadLinks({
  variant = "hero",
}: {
  variant?: "hero" | "footer" | "login";
}) {
  const { install, standalone, failedSurface } = useAppInstallActions();
  const rowStyle =
    variant === "login" ? styles.loginRow : variant === "hero" ? styles.heroRow : styles.footerRow;
  const btnStyle = variant === "login" ? styles.login : variant === "hero" ? styles.hero : styles.footer;
  const textStyle =
    variant === "login" ? styles.loginText : variant === "hero" ? styles.heroText : styles.footerText;

  return (
    <View style={rowStyle}>
      {SURFACES.map((item) => (
        <Pressable
          key={item.surface}
          onPress={() => void install(item.surface)}
          style={btnStyle}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          testID={`landing-download-${item.surface}`}
        >
          <Text style={textStyle}>{item.label}</Text>
        </Pressable>
      ))}
      {standalone ? <Text style={styles.ready}>{APP_ALREADY_INSTALLED}</Text> : null}
      {variant === "login" && failedSurface === "ios" ? (
        <Text style={styles.failNote}>{IOS_NATIVE_NOTE}</Text>
      ) : null}
    </View>
  );
}

export function PwaInstallControls({
  preferredSurface,
}: {
  preferredSurface?: WebInstallSurface | null;
}) {
  const { install, standalone, failedSurface } = useAppInstallActions();
  const [surface, setSurface] = useState<WebInstallSurface>(preferredSurface ?? "desktop");

  useEffect(() => {
    if (preferredSurface) {
      setSurface(preferredSurface);
      return;
    }
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      if (/iphone|ipad|ipod/i.test(ua)) setSurface("ios");
      else if (/android/i.test(ua)) setSurface("android");
      else setSurface("desktop");
    }
  }, [preferredSurface]);

  return (
    <View style={styles.wrap}>
      {standalone ? <Text style={styles.ready}>{APP_ALREADY_INSTALLED}</Text> : null}
      {SURFACES.map((item) => (
        <Pressable
          key={item.surface}
          onPress={() => void install(item.surface)}
          style={item.surface === surface ? styles.primary : styles.secondary}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          testID={`install-${item.surface}`}
        >
          <Text style={item.surface === surface ? styles.primaryText : styles.secondaryText}>
            {item.label}
          </Text>
        </Pressable>
      ))}
      {failedSurface === "ios" ? <Text style={styles.failNote}>{IOS_NATIVE_NOTE}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 12 },
  ready: {
    color: T.success,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  failNote: { color: T.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  primary: {
    backgroundColor: T.electric,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    ...webPointer,
  },
  primaryText: { color: "#001018", fontSize: 16, fontWeight: "900" },
  secondary: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    ...webPointer,
  },
  secondaryText: { color: T.electric, fontSize: 15, fontWeight: "800" },
  top: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...webPointer,
  },
  topText: { color: T.electric, fontWeight: "800", fontSize: 13 },
  hero: {
    borderWidth: 1,
    borderColor: T.gold,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...webPointer,
  },
  heroText: { color: T.gold, fontWeight: "800", fontSize: 15 },
  footer: { paddingVertical: 4, ...webPointer },
  footerText: { color: T.electric, fontWeight: "700", fontSize: 14 },
  inline: { paddingVertical: 2, ...webPointer },
  inlineText: { color: T.electric, fontWeight: "800", fontSize: 14 },
  heroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
  },
  loginRow: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  login: {
    borderWidth: 1,
    borderColor: T.gold,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
    ...webPointer,
  },
  loginText: { color: T.gold, fontWeight: "800", fontSize: 15 },
});
