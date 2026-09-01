import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useBillingState } from "@/hooks/use-billing-state";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { getClientPlatform } from "@/lib/web-checkout";

export type LiveSessionRoomPanelProps = {
  sessionId: string;
  creatorName: string;
  onLeft?: () => void;
};

export function LiveSessionRoomPanel({ sessionId, creatorName, onLeft }: LiveSessionRoomPanelProps) {
  const colors = useColors();
  const router = useRouter();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const utils = trpc.useUtils();

  const [voiceQuestion, setVoiceQuestion] = useState("");
  const [textQuestion, setTextQuestion] = useState("");
  const [showSpeakCheckout, setShowSpeakCheckout] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const room = trpc.aiLiveSessions.getRoomState.useQuery(
    { sessionId },
    { refetchInterval: 8_000, enabled: Boolean(sessionId) },
  );

  const submitQuestion = trpc.aiLiveSessions.submitQuestion.useMutation({
    onSuccess: () => {
      setVoiceQuestion("");
      setTextQuestion("");
      void utils.aiLiveSessions.getRoomState.invalidate({ sessionId });
    },
  });
  const markAnswered = trpc.aiLiveSessions.markQuestionAnswered.useMutation({
    onSuccess: () => void utils.aiLiveSessions.getRoomState.invalidate({ sessionId }),
  });
  const optIn = trpc.aiLiveSessions.optIntoOvertime.useMutation({
    onSuccess: (res) => {
      setStatusMessage(res.message);
      void utils.aiLiveSessions.getRoomState.invalidate({ sessionId });
    },
  });
  const leave = trpc.aiLiveSessions.leaveRoom.useMutation({
    onSuccess: () => {
      void utils.aiLiveSessions.getRoomState.invalidate({ sessionId });
      onLeft?.();
      router.back();
    },
  });
  const purchaseSpeak = trpc.aiLiveSessions.purchaseSpeakAccess.useMutation({
    onSuccess: (res) => {
      setStatusMessage(res.message);
      setShowSpeakCheckout(false);
      void utils.aiLiveSessions.getRoomState.invalidate({ sessionId });
    },
  });

  const data = room.data;
  const busy =
    submitQuestion.isPending ||
    markAnswered.isPending ||
    optIn.isPending ||
    leave.isPending ||
    purchaseSpeak.isPending;

  const voiceQueue = useMemo(
    () => data?.queue.filter((q) => q.channel === "voice") ?? [],
    [data?.queue],
  );
  const textQueue = useMemo(
    () => data?.queue.filter((q) => q.channel === "text") ?? [],
    [data?.queue],
  );

  if (room.isLoading || !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (data.overtime.leftAt) {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>You left the session</Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          Overtime total: {data.overtime.accruedDisplay}. Thanks for joining {creatorName}&apos;s
          class.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {data.showOvertimeNotice && data.overtimeNotice ? (
        <View style={[styles.notice, { backgroundColor: "#f39c1218", borderColor: "#f39c12" }]}>
          <Text style={[styles.noticeTitle, { color: colors.foreground }]}>Overtime Q&A coming up</Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            {data.overtimeNotice}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            {data.overtime.disclosure}
          </Text>
          {data.overtime.canOptIn ? (
            <Pressable
              onPress={() => optIn.mutate({ sessionId })}
              disabled={busy}
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]}
            >
              <Text style={styles.btnText}>
                Stay for Q&A ({data.pricePerMinuteDisplay} pay-as-you-go)
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {data.phase === "overtime" && data.allowOvertime && !data.overtime.optedIn ? (
        <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
            The committed hour has ended. Opt in to stay for bonus questions at{" "}
            {data.pricePerMinuteDisplay}, or leave the room.
          </Text>
          {data.overtime.canOptIn ? (
            <Pressable
              onPress={() => optIn.mutate({ sessionId })}
              disabled={busy}
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]}
            >
              <Text style={styles.btnText}>Opt in to overtime Q&A</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {data.overtime.optedIn ? (
        <View style={[styles.rowCard, { borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>Overtime meter</Text>
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>
            {data.overtime.minutesAccrued} min · {data.overtime.accruedDisplay}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            Leave anytime after your question is answered.
          </Text>
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Speak with the AI — $5</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{data.speak.disclosure}</Text>
        {data.speak.hasAccess ? (
          <>
            <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 8 }}>
              Talk time: {data.speak.minutesRemainingDisplay}
            </Text>
            {data.speak.lowBalance && data.speak.lowBalanceNotice ? (
              <View style={{ marginTop: 8, gap: 8 }}>
                <Text style={{ color: "#c47b17", fontWeight: "700", fontSize: 12, lineHeight: 17 }}>
                  {data.speak.lowBalanceNotice}
                </Text>
                <Pressable
                  onPress={() => setShowSpeakCheckout(true)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.btnText}>Re-up before you run out</Text>
                </Pressable>
              </View>
            ) : null}
            {showSpeakCheckout ? (
              <View style={{ marginTop: 10, gap: 8 }}>
                <BillingStatePicker value={stateCode} onChange={setStateCode} />
                <Pressable
                  onPress={() => {
                    if (!hasState) return;
                    purchaseSpeak.mutate({
                      sessionId,
                      stateCode: stateCode!,
                      clientPlatform: getClientPlatform(),
                    });
                  }}
                  disabled={busy || !hasState}
                  style={[styles.btn, { backgroundColor: colors.primary, opacity: hasState ? 1 : 0.5 }]}
                >
                  <Text style={styles.btnText}>Pay $5 — 20 min speak time</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : showSpeakCheckout ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            <BillingStatePicker value={stateCode} onChange={setStateCode} />
            <Pressable
              onPress={() => {
                if (!hasState) return;
                purchaseSpeak.mutate({
                  sessionId,
                  stateCode: stateCode!,
                  clientPlatform: getClientPlatform(),
                });
              }}
              disabled={busy || !hasState}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: hasState ? 1 : 0.5 }]}
            >
              <Text style={styles.btnText}>Pay $5 — 20 min speak time</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setShowSpeakCheckout(true)}
            style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10 }]}
          >
            <Text style={styles.btnText}>Pay $5 to speak back & forth</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Voice question queue</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
          Voice speakers are answered first. Requires $5 talk access.
        </Text>
        {voiceQueue.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 12 }}>No voice questions yet.</Text>
        ) : (
          voiceQueue.map((q) => (
            <View key={q.id} style={styles.queueRow}>
              <Text style={{ color: colors.foreground, fontSize: 12, flex: 1 }}>
                #{q.queuePosition} {q.isMine ? "(you) " : ""}
                {q.questionPreview}
                {q.status === "active" ? " · LIVE NOW" : ""}
              </Text>
            </View>
          ))
        )}
        <TextInput
          value={voiceQuestion}
          onChangeText={setVoiceQuestion}
          placeholder="Your voice question for the AI…"
          placeholderTextColor={colors.muted}
          maxLength={500}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable
          onPress={() =>
            submitQuestion.mutate({
              sessionId,
              channel: "voice",
              questionText: voiceQuestion.trim(),
            })
          }
          disabled={busy || voiceQuestion.trim().length < 4 || !data.speak.hasAccess}
          style={[
            styles.btnOutline,
            {
              borderColor: colors.primary,
              opacity: data.speak.hasAccess && voiceQuestion.trim().length >= 4 ? 1 : 0.5,
            },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Queue voice question</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Text question queue</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
          {data.textQueueDisclosure}
        </Text>
        {textQueue.length === 0 ? (
          <Text style={{ color: colors.muted, fontSize: 12 }}>No text questions yet.</Text>
        ) : (
          textQueue.map((q) => (
            <View key={q.id} style={styles.queueRow}>
              <Text style={{ color: colors.foreground, fontSize: 12, flex: 1 }}>
                #{q.queuePosition} {q.isMine ? "(you) " : ""}
                {q.questionPreview}
                {q.status === "active" ? " · LIVE NOW" : ""}
              </Text>
            </View>
          ))
        )}
        <TextInput
          value={textQuestion}
          onChangeText={setTextQuestion}
          placeholder="Type your question for the AI…"
          placeholderTextColor={colors.muted}
          maxLength={500}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
        <Pressable
          onPress={() =>
            submitQuestion.mutate({
              sessionId,
              channel: "text",
              questionText: textQuestion.trim(),
            })
          }
          disabled={busy || textQuestion.trim().length < 4}
          style={[
            styles.btnOutline,
            { borderColor: colors.primary, opacity: textQuestion.trim().length >= 4 ? 1 : 0.5 },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Queue text question</Text>
        </Pressable>
      </View>

      {data.myQuestions.some((q) => q.canMarkAnswered) ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>
            Your turn — ask in chat, then mark answered when done
          </Text>
          {data.myQuestions
            .filter((q) => q.canMarkAnswered)
            .map((q) => (
              <Pressable
                key={q.id}
                onPress={() => markAnswered.mutate({ sessionId, questionId: q.id })}
                disabled={busy}
                style={[styles.btn, { backgroundColor: "#27ae60" }]}
              >
                <Text style={styles.btnText}>Question answered — I&apos;m done</Text>
              </Pressable>
            ))}
        </View>
      ) : null}

      {data.overtime.canLeave ? (
        <Pressable
          onPress={() => leave.mutate({ sessionId })}
          disabled={busy}
          style={[styles.leaveBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Leave session</Text>
        </Pressable>
      ) : null}

      {statusMessage ? (
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>{statusMessage}</Text>
      ) : null}
      {(submitQuestion.error || purchaseSpeak.error || optIn.error) && (
        <Text style={{ color: "#e74c3c", fontSize: 12, textAlign: "center" }}>
          {submitQuestion.error?.message ??
            purchaseSpeak.error?.message ??
            optIn.error?.message}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 340 },
  scrollContent: { padding: 12, gap: 10, paddingBottom: 20 },
  loading: { padding: 16, alignItems: "center" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  rowCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  noticeTitle: { fontWeight: "800", fontSize: 14 },
  title: { fontWeight: "800", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 6,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  btnOutline: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  queueRow: { paddingVertical: 4 },
  leaveBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
});
