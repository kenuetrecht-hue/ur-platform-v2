import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { trpc } from "@/lib/trpc";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LandingConversionModal } from "@/components/landing/landing-conversion-modal";
import { LANDING_DEMO_MESSAGE_MAX, LANDING_DEMO_REPLY_MAX } from "@/lib/landing-demo-policy";
import { saveLandingDemoAttributionId } from "@/lib/landing-demo-attribution-storage";
import { useAuth } from "@/lib/auth-context";
import { Link } from "expo-router";
import { AGE_KYC_REQUIRED_MESSAGE } from "@/lib/age-kyc-policy";
import { TurnstileWidget } from "@/components/turnstile-widget";

const DEMO_SPECIALISTS = [
  { id: "ai-coder-001", label: "TechBuilder", avatar: "💻" },
  { id: "ai-marina-mechanic-001", label: "Marina Mechanic", avatar: "⚓" },
  { id: "contentmate", label: "ContentMate", avatar: "✨" },
  { id: "linguamate", label: "LinguaMate", avatar: "🌍" },
  { id: "ai-wellness-001", label: "Wellness Coach", avatar: "🧘" },
  { id: "ai-3d-specialist", label: "3D Designer", avatar: "⬡" },
] as const;

type Props = {
  onReply?: () => void;
  creatorId?: string;
  onCreatorIdChange?: (id: string) => void;
};

export function LandingDemoChat({ onReply, creatorId: controlledCreatorId, onCreatorIdChange }: Props) {
  const { isAuthenticated } = useAuth();
  const kycQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 15_000,
  });
  const kycVerified = kycQuery.data?.verified === true;
  const [internalCreatorId, setInternalCreatorId] = useState<string>(DEMO_SPECIALISTS[0].id);
  const creatorId = controlledCreatorId ?? internalCreatorId;

  const setCreatorId = (id: string) => {
    if (onCreatorIdChange) onCreatorIdChange(id);
    else setInternalCreatorId(id);
  };
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [attributionId, setAttributionId] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const pageLoadedAtMs = useRef(Date.now());

  useEffect(() => {
    pageLoadedAtMs.current = Date.now();
  }, []);

  const statusQuery = trpc.landing.getDemoStatus.useQuery(undefined, { staleTime: 30_000 });
  const demoMutation = trpc.landing.sendDemoMessage.useMutation({
    onSuccess: (data) => {
      setReply(data.reply);
      if (data.attributionId) {
        setAttributionId(data.attributionId);
        void saveLandingDemoAttributionId(data.attributionId);
      }
      setModalOpen(true);
      onReply?.();
      void statusQuery.refetch();
    },
    onError: (err) => setError(err.message),
  });

  const demoUsed = statusQuery.data?.demoUsed ?? false;
  const demoToken = statusQuery.data?.demoToken ?? null;
  const messageMax = statusQuery.data?.limits?.messageMax ?? LANDING_DEMO_MESSAGE_MAX;
  const loading = demoMutation.isPending;
  const canSend =
    isAuthenticated &&
    kycVerified &&
    !demoUsed &&
    !loading &&
    Boolean(demoToken) &&
    message.trim().length >= 4;

  const send = () => {
    if (!canSend || !demoToken) return;
    setError(null);
    demoMutation.mutate({
      creatorId,
      message: message.trim(),
      demoToken,
      pageLoadedAtMs: pageLoadedAtMs.current,
      honeypot: honeypot || undefined,
      platform: Platform.OS === "web" ? "web" : Platform.OS === "ios" ? "ios" : "android",
      turnstileToken: turnstileToken || undefined,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTag}>18+ INTERACTIVE DEMO</Text>
      <Text style={styles.title}>Try a specialist after ID verification</Text>
      <Text style={styles.sub}>
        Adults only. Create an account, photograph your ID front and back plus a selfie, then send
        one demo message ({messageMax} characters in).
      </Text>

      {!isAuthenticated ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sub}>{AGE_KYC_REQUIRED_MESSAGE}</Text>
          <Link href="/signup" asChild>
            <Pressable style={styles.sendBtn}>
              <Text style={styles.sendText}>Create account to verify age</Text>
            </Pressable>
          </Link>
        </View>
      ) : !kycVerified ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.sub}>Finish the ID and selfie check before this demo will send.</Text>
          <Link href="/age-verify" asChild>
            <Pressable style={styles.sendBtn}>
              <Text style={styles.sendText}>Open 18+ ID check</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {!onCreatorIdChange ? (
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
      ) : (
        <Text style={styles.selectedNote}>
          Selected: {DEMO_SPECIALISTS.find((s) => s.id === creatorId)?.label ?? "Specialist"}
        </Text>
      )}

      {Platform.OS === "web" ? (
        <TextInput
          value={honeypot}
          onChangeText={setHoneypot}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          autoComplete="off"
          tabIndex={-1}
          style={styles.honeypot}
        />
      ) : null}

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={
          creatorId === "ai-marina-mechanic-001"
            ? "e.g. My outboard cranks but won't start after winter..."
            : "Ask your specialist anything..."
        }
        placeholderTextColor={T.muted}
        maxLength={messageMax}
        editable={!demoUsed && !loading}
        style={styles.input}
        multiline
      />
      <Text style={styles.counter}>
        {message.length}/{messageMax}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {demoUsed ? (
        <Text style={styles.usedNote}>Free demo used — create an account for unlimited chat.</Text>
      ) : null}

      {isAuthenticated && kycVerified && !demoUsed ? (
        <View style={{ marginBottom: 10 }}>
          <TurnstileWidget action="landing_demo" onToken={setTurnstileToken} />
        </View>
      ) : null}

      <Pressable
        onPress={send}
        disabled={!canSend}
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
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
          <Text style={styles.replyText}>{reply}</Text>
        </View>
      ) : null}

      <LandingConversionModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        creatorId={creatorId}
        reply={reply ?? ""}
        creatorName={DEMO_SPECIALISTS.find((s) => s.id === creatorId)?.label ?? "AI"}
        attributionId={attributionId}
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
    color: T.brandBlueLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: { color: T.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: T.muted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  selectedNote: {
    color: T.brandPurpleLight,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
  },
  pills: { gap: 8, marginBottom: 14 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.borderBrand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  pillActive: { borderColor: T.brandBlueLight, backgroundColor: "rgba(79, 70, 229, 0.2)" },
  pillEmoji: { fontSize: 16 },
  pillLabel: { color: T.muted, fontSize: 13, fontWeight: "600" },
  pillLabelActive: { color: T.text },
  honeypot: {
    position: "absolute",
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    minHeight: 88,
    padding: 14,
    color: T.text,
    fontSize: 15,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  counter: { color: T.muted, fontSize: 11, textAlign: "right", marginBottom: 12 },
  sendBtn: {
    backgroundColor: T.brandBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.brandPurpleLight,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
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
