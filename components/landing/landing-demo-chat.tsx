import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { trpc } from "@/lib/trpc";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LandingConversionModal } from "@/components/landing/landing-conversion-modal";

const DEMO_SPECIALISTS = [
  { id: "ai-marina-mechanic-001", label: "Marina Mechanic", avatar: "⚓" },
  { id: "contentmate", label: "ContentMate", avatar: "✨" },
  { id: "linguamate", label: "LinguaMate", avatar: "🌍" },
  { id: "ai-wellness-001", label: "Wellness Coach", avatar: "🧘" },
  { id: "ai-3d-specialist", label: "3D Designer", avatar: "⬡" },
] as const;

type Props = {
  onReply?: () => void;
};

export function LandingDemoChat({ onReply }: Props) {
  const [creatorId, setCreatorId] = useState<string>(DEMO_SPECIALISTS[0].id);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusQuery = trpc.landing.getDemoStatus.useQuery(undefined, { staleTime: 30_000 });
  const demoMutation = trpc.landing.sendDemoMessage.useMutation({
    onSuccess: (data) => {
      setReply(data.reply);
      setModalOpen(true);
      onReply?.();
      void statusQuery.refetch();
    },
    onError: (err) => setError(err.message),
  });

  const demoUsed = statusQuery.data?.demoUsed ?? false;
  const loading = demoMutation.isPending;

  const send = () => {
    if (!message.trim() || demoUsed || loading) return;
    setError(null);
    demoMutation.mutate({ creatorId, message: message.trim() });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTag}>INTERACTIVE TEST DRIVE</Text>
      <Text style={styles.title}>Try a specialist — one free message</Text>
      <Text style={styles.sub}>
        No account required. Pick any specialist on the platform — same engine, same guardrails,
        same hive behind every reply.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {DEMO_SPECIALISTS.map((s) => {
          const active = s.id === creatorId;
          return (
            <Pressable
              key={s.id}
              onPress={() => setCreatorId(s.id)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={styles.pillEmoji}>{s.avatar}</Text>
              <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={
          creatorId === "ai-marina-mechanic-001"
            ? "e.g. My outboard cranks but won't start after winter..."
            : "Ask your specialist anything..."
        }
        placeholderTextColor={T.muted}
        maxLength={280}
        editable={!demoUsed && !loading}
        style={styles.input}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {demoUsed ? (
        <Text style={styles.usedNote}>Free demo used — create an account for unlimited chat.</Text>
      ) : null}

      <Pressable
        onPress={send}
        disabled={demoUsed || loading || !message.trim()}
        style={[styles.sendBtn, (demoUsed || !message.trim()) && styles.sendBtnDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#001018" />
        ) : (
          <Text style={styles.sendText}>{demoUsed ? "Demo used — sign up" : "Send free message →"}</Text>
        )}
      </Pressable>

      {reply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>AI RESPONSE</Text>
          <Text style={styles.replyText}>
            {reply.slice(0, 600)}
            {reply.length > 600 ? "…" : ""}
          </Text>
        </View>
      ) : null}

      <LandingConversionModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        creatorId={creatorId}
        reply={reply ?? ""}
        creatorName={DEMO_SPECIALISTS.find((s) => s.id === creatorId)?.label ?? "AI"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bgElevated,
    padding: 20,
    marginBottom: 32,
  },
  sectionTag: {
    color: T.electric,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: { color: T.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  pills: { gap: 8, marginBottom: 14 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  pillActive: { borderColor: T.electric, backgroundColor: "rgba(0,212,255,0.12)" },
  pillEmoji: { fontSize: 16 },
  pillLabel: { color: T.muted, fontSize: 13, fontWeight: "600" },
  pillLabelActive: { color: T.text },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    minHeight: 88,
    padding: 14,
    color: T.text,
    fontSize: 15,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  sendBtn: {
    backgroundColor: T.electric,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendText: { color: "#001018", fontWeight: "800", fontSize: 15 },
  error: { color: "#f87171", fontSize: 13, marginBottom: 8 },
  usedNote: { color: T.gold, fontSize: 12, marginBottom: 8 },
  replyBox: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 14,
  },
  replyLabel: { color: T.electricDim, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 6 },
  replyText: { color: T.text, fontSize: 14, lineHeight: 21 },
});
