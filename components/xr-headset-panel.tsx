import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { WorkspaceTapButton } from "@/components/workspace-tap-button";
import {
  detectXrHeadset,
  printCurrentDocument,
  XR_GAME_FORGE_PATH,
  XR_WORKSPACE_PATH,
  XR_WORLD_PATH,
  type XrSupport,
} from "@/lib/ai-device-bridge";

export function XrHeadsetPanel({ context }: { context: "world" | "workspace" }) {
  const colors = useColors();
  const router = useRouter();
  const [xr, setXr] = useState<XrSupport | null>(null);
  const [printNote, setPrintNote] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    void detectXrHeadset().then(setXr);
  }, []);

  const otherPath = context === "world" ? XR_WORKSPACE_PATH : XR_WORLD_PATH;

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Headset, print, and access</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        3D helmets (Quest, Vision-class, PC VR) open this lab in the headset browser. Paper printers use
        the print dialog on this device. 3D printers stay on the shop connection you already authorized.
        Bluetooth and Wi-Fi pairing for extra gear comes later — we will not scan anyone else's devices.
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
        {Platform.OS === "web"
          ? xr?.detail ?? "Checking WebXR…"
          : "Open the website in your headset browser for VR. Native stays for Talk."}
      </Text>
      <View style={styles.row}>
        <WorkspaceTapButton
          onPress={() => router.push(otherPath as never)}
          style={[styles.btn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
            {context === "world" ? "3D Workspace" : "UR World"}
          </Text>
        </WorkspaceTapButton>
        <WorkspaceTapButton
          onPress={() => router.push(XR_GAME_FORGE_PATH as never)}
          style={[styles.btn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>GameForge</Text>
        </WorkspaceTapButton>
        <WorkspaceTapButton
          onPress={() => {
            const result = printCurrentDocument();
            setPrintNote(result.detail);
          }}
          style={[styles.btn, { borderColor: colors.primary }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>Print this page</Text>
        </WorkspaceTapButton>
      </View>
      {printNote ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>{printNote}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  title: { fontSize: 15, fontWeight: "800" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  btn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
