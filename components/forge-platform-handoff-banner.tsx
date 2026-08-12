import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  assessForgeProjectScale,
  buildForgeAisWebPath,
  forgeCreatorLabel,
} from "@/lib/forge-platform-handoff";
import { openWebBrowserCheckout } from "@/lib/web-checkout";
import { useRouter } from "expo-router";

type Props = {
  creatorId: string;
  usagePercent?: number;
  projectFileCount?: number;
  editingFileChars?: number;
  estimatedBundleKb?: number;
  tierId?: string;
};

export function ForgePlatformHandoffBanner({
  creatorId,
  usagePercent,
  projectFileCount,
  editingFileChars,
  estimatedBundleKb,
  tierId,
}: Props) {
  const colors = useColors();
  const router = useRouter();
  const name = forgeCreatorLabel(creatorId);
  const isNativeApp = Platform.OS !== "web";
  const isWeb = Platform.OS === "web";

  const assessment = assessForgeProjectScale({
    isNativeApp,
    creatorId,
    usagePercent,
    projectFileCount,
    editingFileChars,
    estimatedBundleKb,
    tierId,
  });

  const openWebBuild = () => {
    const path = buildForgeAisWebPath(creatorId, "build");
    if (isNativeApp) {
      void openWebBrowserCheckout(path);
      return;
    }
    router.push(path as never);
  };

  if (isWeb) {
    return (
      <View style={[styles.card, { backgroundColor: `${colors.primary}14`, borderColor: colors.primary }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>🌐 Full {name} Build tools</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          You&apos;re on the website — sandbox, Forge agent, GitHub sync, preview, and deploy run best here. Same
          account on mobile for chat and small edits.
        </Text>
      </View>
    );
  }

  if (assessment.shouldHandoffToWeb) {
    return (
      <View style={[styles.card, { backgroundColor: "#fef3c722", borderColor: "#f59e0b" }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>📱 → 🌐 Continue on the website</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{assessment.message}</Text>
        <Pressable onPress={openWebBuild} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Open {name} in browser</Text>
        </Pressable>
        <Text style={[styles.hint, { color: colors.muted }]}>
          You can still chat and Learn here — open the same project on web to keep building.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>📱 {name} on mobile</Text>
      <Text style={[styles.body, { color: colors.muted }]}>
        Prototype and edit small projects here. When the sandbox fills up or you need Forge agent / GitHub tools,
        continue on the website.
      </Text>
      <Pressable
        onPress={openWebBuild}
        style={[styles.btnOutline, { borderColor: colors.primary }]}
      >
        <Text style={[styles.btnText, { color: colors.primary }]}>Open full builder on web</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  title: { fontWeight: "800", fontSize: 13 },
  body: { fontSize: 12, lineHeight: 18 },
  hint: { fontSize: 11, lineHeight: 16 },
  btn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnOutline: { borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
