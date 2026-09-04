import { Link } from "expo-router";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { APP_DOWNLOAD_PATH } from "@/lib/app-download";
import { LANDING_THEME as T } from "@/lib/landing-theme";

type Variant = "top" | "hero" | "footer" | "inline";

export function LandingAppDownloadLink({ variant }: { variant: Variant }) {
  const label = variant === "top" ? "Download app" : "Download the app";
  const textStyle = {
    top: styles.topText,
    hero: styles.heroText,
    footer: styles.footerText,
    inline: styles.inlineText,
  }[variant];

  return (
    <Link href={APP_DOWNLOAD_PATH} asChild>
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

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null;

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
});
