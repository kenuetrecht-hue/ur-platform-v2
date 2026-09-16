import { Link } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ANDROID_DOWNLOAD_LABEL,
  COMPUTER_DOWNLOAD_LABEL,
  IPHONE_DOWNLOAD_LABEL,
  downloadPathForSurface,
} from "@/lib/app-download";
import { LANDING_THEME as T } from "@/lib/landing-theme";

type Variant = "top" | "hero" | "footer" | "inline";

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null;

export function LandingAppDownloadLink({ variant }: { variant: Variant }) {
  const label = variant === "top" ? "Download app" : "Download the app";
  const textStyle = {
    top: styles.topText,
    hero: styles.heroText,
    footer: styles.footerText,
    inline: styles.inlineText,
  }[variant];

  return (
    <Link href={downloadPathForSurface("desktop")} asChild>
      <Pressable
        style={styles[variant]}
        accessibilityRole="link"
        accessibilityLabel="Download the UR app from this website"
      >
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function LandingDeviceDownloadLinks({
  variant = "hero",
}: {
  variant?: "hero" | "footer" | "login";
}) {
  const items = [
    { surface: "ios" as const, label: IPHONE_DOWNLOAD_LABEL },
    { surface: "android" as const, label: ANDROID_DOWNLOAD_LABEL },
    { surface: "desktop" as const, label: COMPUTER_DOWNLOAD_LABEL },
  ];
  const rowStyle =
    variant === "login" ? styles.loginRow : variant === "hero" ? styles.heroRow : styles.footerRow;
  const btnStyle = variant === "login" ? styles.login : variant === "hero" ? styles.hero : styles.footer;
  const textStyle =
    variant === "login" ? styles.loginText : variant === "hero" ? styles.heroText : styles.footerText;

  return (
    <View style={rowStyle}>
      {items.map((item) => (
        <Link key={item.surface} href={downloadPathForSurface(item.surface)} asChild>
          <Pressable
            style={btnStyle}
            accessibilityRole="link"
            accessibilityLabel={item.label}
            testID={`landing-download-${item.surface}`}
          >
            <Text style={textStyle}>{item.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
