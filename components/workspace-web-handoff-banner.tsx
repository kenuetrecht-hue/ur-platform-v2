import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import { useRouter } from "expo-router";
import { build3dWorkspaceWebPath } from "@/lib/forge-platform-handoff";

type Props = {
  variant?: "merch" | "playroom" | "general";
};

export function WorkspaceWebHandoffBanner({ variant = "general" }: Props) {
  const colors = useColors();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const path =
    variant === "merch"
      ? build3dWorkspaceWebPath({ project: "merchandise" })
      : "/3d-workspace";

  const openWeb = () => {
    if (isWeb) {
      router.push(path as never);
      return;
    }
    void openWebBrowserCheckout(path);
  };

  if (isWeb) {
    if (variant === "merch") {
      return (
        <View style={[styles.card, { backgroundColor: `${colors.primary}14`, borderColor: colors.primary }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>👕 Creator merch & 3D print</Text>
          <Text style={[styles.body, { color: colors.muted }]}>
            Design keychains, logos, figurines, and print-ready STL files in the browser. Export for your merch store
            or UR Shop — best for small creator projects on web.
          </Text>
        </View>
      );
    }
    return null;
  }

  const title =
    variant === "merch"
      ? "👕 Merch & 3D print — open in browser"
      : variant === "playroom"
        ? "🎪 AI Playroom — open in browser"
        : "🎮 3D Builder — open in browser";

  const body =
    variant === "merch"
      ? "The full Babylon.js canvas (orbit, zoom, STL upload, print export) runs on the website. Perfect for small merch designs — keychains, logos, and promo items for content creators."
      : "Full 3D playground with Babylon.js, layer editing, and STL export runs on the website. Your layers sync to the same account.";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{body}</Text>
      <Pressable onPress={openWeb} style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Text style={styles.btnText}>Open 3D workspace in browser</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginHorizontal: 16 },
  title: { fontWeight: "800", fontSize: 13 },
  body: { fontSize: 12, lineHeight: 18 },
  btn: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
