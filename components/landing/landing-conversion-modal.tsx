import { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LANDING_DEMO_REPLY_MAX, LANDING_DEMO_VOICE_TEXT_MAX } from "@/lib/landing-demo-policy";

const displayReply = (text: string) => text.slice(0, LANDING_DEMO_REPLY_MAX);

type Props = {
  visible: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  reply: string;
  attributionId?: string | null;
};

export function LandingConversionModal({ visible, onClose, creatorId, creatorName, reply, attributionId }: Props) {
  const router = useRouter();
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recordSignupClick = trpc.landing.recordDemoSignupClick.useMutation();

  const goSignup = () => {
    if (attributionId) {
      recordSignupClick.mutate({ attributionId });
    }
    const query = new URLSearchParams({
      source: "landing_demo",
      demoCreator: creatorId,
    });
    if (attributionId) query.set("demoAttribution", attributionId);
    router.push(`/signup?${query.toString()}`);
  };

  const voiceMutation = trpc.landing.synthesizeDemoVoice.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        setVoiceError(data.error ?? "Voice unavailable");
        return;
      }
      if (Platform.OS === "web" && typeof Audio !== "undefined") {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        void audio.play();
      }
    },
    onError: (err) => setVoiceError(err.message),
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.glowTag}>◈ HIVE RESPONSE LOCKED IN</Text>
          <Text style={styles.title}>{creatorName} replied</Text>
          <Text style={styles.body} numberOfLines={3}>
            {displayReply(reply)}
          </Text>

          <Pressable
            onPress={() =>
              voiceMutation.mutate({
                creatorId: creatorId as "ai-coder-001" | "ai-marina-mechanic-001" | "contentmate" | "linguamate" | "ai-wellness-001" | "ai-3d-specialist",
                text: displayReply(reply).slice(0, LANDING_DEMO_VOICE_TEXT_MAX),
              })
            }
            disabled={voiceMutation.isPending}
            style={styles.voiceBtn}
          >
            {voiceMutation.isPending ? (
              <ActivityIndicator color={T.electric} />
            ) : (
              <Text style={styles.voiceText}>▶ Hear ElevenLabs voice preview</Text>
            )}
          </Pressable>
          {voiceError ? <Text style={styles.voiceErr}>{voiceError}</Text> : null}

          <Text style={styles.hook}>
            Every specialist runs on the same platform — unlock the full hive with one membership.
          </Text>

          <Pressable onPress={goSignup} style={styles.primary}>
            <Text style={styles.primaryText}>Create free account →</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/ais")} style={styles.secondary}>
            <Text style={styles.secondaryText}>Explore AI Hub first</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.electric,
    backgroundColor: T.bgElevated,
    padding: 24,
    shadowColor: T.electric,
    shadowOpacity: 0.45,
    shadowRadius: 24,
  },
  glowTag: {
    color: T.electric,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: { color: T.text, fontSize: 22, fontWeight: "900", marginBottom: 12 },
  body: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  voiceBtn: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  voiceText: { color: T.electric, fontWeight: "700", fontSize: 14 },
  voiceErr: { color: "#f87171", fontSize: 12, marginBottom: 8 },
  hook: { color: T.text, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  primary: {
    backgroundColor: T.electric,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryText: { color: "#001018", fontWeight: "800", fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  secondaryText: { color: T.text, fontWeight: "600" },
  close: { alignItems: "center", padding: 8 },
  closeText: { color: T.muted, fontSize: 13 },
});
