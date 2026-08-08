import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import { isForgeSpecialist } from "@/lib/forge-specialists";
import { AFFILIATE_ASSOCIATE_ID } from "@/lib/affiliate-associate-catalog";
import { speakText } from "@/lib/azure-tts-service";
import { useRouter } from "expo-router";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";
import { useAiTalkMeterPlayback } from "@/hooks/use-ai-talk-meter-playback";
import { useNetworkConnectivity, isMeteringConnected } from "@/hooks/use-network-connectivity";
import { METER_HEARTBEAT_INTERVAL_MS } from "@/lib/ai-metering-policy";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  id: string;
}

export type CreatorAIInterfaceProps = {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  welcomeMessage?: string;
  initialPrompt?: string;
  onClose?: () => void;
  /** Hide the in-chat header when the parent screen already shows specialist info. */
  hideHeader?: boolean;
  /** Compact layout for the AIs tab — hides extra chrome, docks composer to message list. */
  embedded?: boolean;
  /** Fixed UI height above chat (for keyboard offset). Defaults to AIs tab estimate when embedded. */
  overlapHeaderHeight?: number;
};

export function CreatorAIInterface({
  creatorId,
  creatorName,
  creatorAvatar = "✨",
  welcomeMessage,
  initialPrompt,
  onClose,
  hideHeader = false,
  embedded = false,
  overlapHeaderHeight,
}: CreatorAIInterfaceProps) {
  const colors = useColors();
  const router = useRouter();
  const overlap = useOverlapInsets({
    reserveTabBar: embedded,
    headerChromeHeight: embedded
      ? (overlapHeaderHeight ?? LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT)
      : 0,
  });
  const defaultWelcome =
    welcomeMessage ??
    `Hi! I'm ${creatorName}. I understand any language — ask me anything in my area of expertise.`;
  const scrollViewRef = useRef<ScrollView>(null);
  const messageSeq = useRef(0);

  const makeMessage = useCallback(
    (role: ChatMessage["role"], text: string): ChatMessage => {
      messageSeq.current += 1;
      return { role, text, id: `${creatorId}-${messageSeq.current}` };
    },
    [creatorId],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: defaultWelcome, id: `${creatorId}-welcome` },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hiveMode, setHiveMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [awaitingPitchConsent, setAwaitingPitchConsent] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const [aiReachable, setAiReachable] = useState<boolean | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBaseUrl();
    if (!base) {
      setApiReachable(false);
      return;
    }
    fetch(`${base}/api/health`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setApiReachable(false);
          return;
        }
        setApiReachable(true);
        const body = (await res.json()) as {
          ai?: { reachable?: boolean; hint?: string };
        };
        setAiReachable(body.ai?.reachable ?? null);
        setAiHint(body.ai?.hint ?? null);
      })
      .catch(() => {
        if (!cancelled) setApiReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function formatChatError(error: unknown): string {
    const fromTrpc =
      typeof error === "object" &&
      error &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
        ? String((error as { message: string }).message)
        : "";
    const raw =
      error instanceof Error
        ? error.message
        : fromTrpc || "Unknown error";
    if (/fetch|network|failed to connect|ECONNREFUSED/i.test(raw)) {
      return (
        `Cannot reach the API at ${getApiBaseUrl() || "(not configured)"}. ` +
        `Stop other dev servers, run node scripts/free-dev-ports.mjs, then pnpm dev. ` +
        `The API must listen on port 3000.`
      );
    }
    if (/unexpected error occurred|upstream service error/i.test(raw)) {
      return (
        "The AI server hit an error (often a Gemini model or API key issue). " +
        "Check the terminal running pnpm dev for [google-ai] logs, then reload the app."
      );
    }
    if (/rate limit|429|quota/i.test(raw)) {
      return (
        "Gemini free-tier quota reached. Wait 2 minutes, check https://ai.dev/rate-limit, or create a new API key at https://aistudio.google.com/apikey"
      );
    }
    if (/invalid|api key/i.test(raw)) {
      return (
        "Gemini API key is invalid. Create a key at https://aistudio.google.com/apikey, " +
        "update CONTENTMATE_GEMINI_API_KEY in .env, save, then restart pnpm dev."
      );
    }
    return raw || "Sorry, I encountered an error. Please try again.";
  }

  const chatMutation = trpc.aiCreators.sendMessage.useMutation();
  const voiceMutation = trpc.aiCreators.synthesizeVoice.useMutation();
  const premium = trpc.aiCreators.premiumMediaStatus.useQuery();
  const talkStatus = trpc.aiTalk.getStatus.useQuery();
  const buyTalk = trpc.aiTalk.purchase.useMutation({
    onSuccess: () => {
      void premium.refetch();
      void talkStatus.refetch();
    },
  });
  const buyVideo = trpc.aiTalk.purchase.useMutation({
    onSuccess: () => {
      void premium.refetch();
      void talkStatus.refetch();
    },
  });
  const buyAffiliateVoice = trpc.partnerDashboard.purchaseAffiliateVoice.useMutation({
    onSuccess: () => void premium.refetch(),
  });
  const assertVideo = trpc.aiCreators.assertVideoTalkAccess.useMutation();
  const [videoActive, setVideoActive] = useState(false);
  const [videoMeterSessionId, setVideoMeterSessionId] = useState<string | null>(null);
  const { playMeteredAudio } = useAiTalkMeterPlayback();
  const meterConnectivity = useNetworkConnectivity();
  const meterHeartbeat = trpc.aiTalk.meterHeartbeat.useMutation();
  const meterFinalize = trpc.aiTalk.meterFinalize.useMutation();
  const hiveProfile = trpc.aiCreators.getHiveProfile.useQuery({ creatorId });
  const handoffs = trpc.aiCreators.getHandoffs.useQuery({ creatorId });
  const isAssociateAi = creatorId === AFFILIATE_ASSOCIATE_ID;
  const talkMinutes = talkStatus.data?.minutesRemaining ?? premium.data?.talkMinutesRemaining ?? 0;
  const hasTalkTime = talkMinutes > 0;
  const supportsVoice = isForgeSpecialist(creatorId) || isAssociateAi || hasTalkTime;
  const hasPaidVoice =
    isAssociateAi
      ? Boolean(premium.data?.affiliateVoice)
      : creatorId === "contentmate"
        ? Boolean(premium.data?.creatorVoice)
        : true;

  useEffect(() => {
    messageSeq.current = 0;
    const welcome =
      welcomeMessage ??
      `Hi! I'm ${creatorName}. I understand any language — ask me anything in my area of expertise.`;
    setMessages([makeMessage("ai", welcome)]);
    setInputText(initialPrompt ?? "");
    setLoading(false);
    setSendStatus(null);
  }, [creatorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const CHAT_TIMEOUT_MS = 45_000;

  const sendChatMessage = useCallback(
    async (rawText: string) => {
      const userMessage = rawText.trim().slice(0, 2000);
      if (!userMessage || loading) return;

      setLoading(true);
      setSendStatus("Sending…");
      const clearedInput = rawText === inputText;
      setMessages((prev) => [...prev, makeMessage("user", userMessage)]);
      scrollToBottom();
      if (clearedInput) {
        setInputText("");
      }

      try {
        const priorTurns = messages
          .filter((m) => m.role === "user" || m.role === "ai")
          .slice(-10)
          .map((m) => ({
            role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: m.text,
          }));
        while (priorTurns.length > 0 && priorTurns[0]?.role === "assistant") {
          priorTurns.shift();
        }

        const result = await Promise.race([
          chatMutation.mutateAsync({
            creatorId,
            message: userMessage,
            history: priorTurns,
            useHiveConsult: hiveMode,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Request timed out after ${CHAT_TIMEOUT_MS / 1000}s. ` +
                      `Is the API running? Run: node scripts/free-dev-ports.mjs then pnpm dev`,
                  ),
                ),
              CHAT_TIMEOUT_MS,
            );
          }),
        ]);

        let replyText = result.reply;
        if (result.hiveConsulted?.length) {
          replyText += `\n\n🐝 Hive consulted: ${result.hiveConsulted.map((p) => p.name).join(", ")}`;
        }

        setMessages((prev) => [...prev, makeMessage("ai", replyText)]);
        setAwaitingPitchConsent(Boolean(result.pitchConsentRequest));
        setSendStatus(null);
      } catch (error) {
        const errText = formatChatError(error);
        setMessages((prev) => [...prev, makeMessage("ai", errText)]);
        setSendStatus(errText.slice(0, 120));
        if (clearedInput) {
          setInputText(userMessage);
        }
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [chatMutation, creatorId, hiveMode, inputText, loading, makeMessage, messages, scrollToBottom],
  );

  const speakLastReply = useCallback(async () => {
    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    if (!lastAi?.text || voiceMutation.isPending) return;

    if (isAssociateAi && !hasPaidVoice) {
      try {
        await buyAffiliateVoice.mutateAsync();
      } catch (error) {
        setVoiceStatus(error instanceof Error ? error.message : "Could not purchase voice pack");
        return;
      }
    } else if (!isAssociateAi && !hasTalkTime) {
      setVoiceStatus(
        "Purchase talk time first — $5 in the app (25 min) or $1 on web (5 min). Open AI Talk Time below.",
      );
      return;
    }

    setVoiceStatus(null);
    try {
      const result = await voiceMutation.mutateAsync({
        creatorId,
        text: lastAi.text.slice(0, 3000),
      });
      if (result.success) {
        if (result.meterSessionId && result.audioUrl?.startsWith("data:")) {
          setVoiceStatus(`🔊 ${result.persona} — playing (metered to the ms)`);
          await playMeteredAudio({
            meterSessionId: result.meterSessionId,
            audioUrl: result.audioUrl,
            durationMs: result.durationMs ?? Math.round(result.duration * 1000),
            onStatus: setVoiceStatus,
          });
        } else if (typeof window !== "undefined" && result.audioUrl?.startsWith("data:")) {
          const audio = new window.Audio(result.audioUrl);
          void audio.play();
          setVoiceStatus(`🔊 ${result.persona} — ${Math.round(result.duration)}s audio ready`);
        } else if (Platform.OS !== "web") {
          await speakText(lastAi.text);
          setVoiceStatus(`🔊 ${result.persona} — native voice`);
        }
      } else {
        setVoiceStatus(result.error ?? "Voice unavailable");
      }
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Voice failed");
    }
  }, [buyAffiliateVoice, creatorId, hasPaidVoice, hasTalkTime, isAssociateAi, messages, playMeteredAudio, voiceMutation]);

  useEffect(() => {
    if (!videoActive || !videoMeterSessionId) return;

    const tick = () => {
      const connected = isMeteringConnected(meterConnectivity);
      void meterHeartbeat.mutateAsync({
        sessionId: videoMeterSessionId,
        playbackPositionMs: 0,
        clientOnline: connected,
      });
    };

    tick();
    const interval = setInterval(tick, METER_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [videoActive, videoMeterSessionId, meterConnectivity, meterHeartbeat]);

  const stopVideoTalk = useCallback(async () => {
    if (videoMeterSessionId) {
      try {
        await meterFinalize.mutateAsync({
          sessionId: videoMeterSessionId,
          playbackPositionMs: 0,
        });
        void talkStatus.refetch();
      } catch {
        /* session may already be finalized */
      }
    }
    setVideoMeterSessionId(null);
    setVideoActive(false);
  }, [meterFinalize, talkStatus, videoMeterSessionId]);

  const startVideoTalk = useCallback(async () => {
    try {
      if (!hasTalkTime) {
        setVoiceStatus(
          "Purchase talk time first — $5 in the mobile app (25 min) or $1 on web (5 min).",
        );
        return;
      }
      const access = await assertVideo.mutateAsync({ creatorId });
      if (access.meterSessionId) {
        setVideoMeterSessionId(access.meterSessionId);
      }
      setVideoActive(true);
      setVoiceStatus("📹 Video talk — billed only while connected");
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Video talk unavailable");
    }
  }, [assertVideo, creatorId, hasTalkTime]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={embedded && Platform.OS === "ios" ? overlap.keyboardBehavior : undefined}
      keyboardVerticalOffset={embedded && Platform.OS === "ios" ? overlap.keyboardVerticalOffset : 0}
    >
      {!hideHeader ? (
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerAvatar}>{creatorAvatar}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {creatorName}
          </Text>
          {onClose ? (
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Text style={styles.headerTitle}>✕</Text>
            </Pressable>
          ) : (
            <View style={styles.closePlaceholder} />
          )}
        </View>
      </View>
      ) : null}

      {!embedded && apiReachable === false ? (
        <View
          style={[
            styles.apiBanner,
            { backgroundColor: `${colors.error}18`, borderColor: colors.error },
          ]}
        >
          <Text style={{ color: colors.error, fontSize: 11, lineHeight: 16, textAlign: "center" }}>
            API offline — chat cannot send. Run node scripts/free-dev-ports.mjs then pnpm dev. Expected:{" "}
            {getApiBaseUrl() || "set EXPO_PUBLIC_API_BASE_URL in .env"}
          </Text>
        </View>
      ) : null}

      {!embedded && apiReachable === true && aiReachable === false ? (
        <View
          style={[
            styles.apiBanner,
            { backgroundColor: `${colors.error}18`, borderColor: colors.error },
          ]}
        >
          <Text style={{ color: colors.error, fontSize: 11, lineHeight: 16, textAlign: "center" }}>
            {aiHint ??
              "Gemini AI key invalid. Get a key at aistudio.google.com/apikey, update .env, restart pnpm dev."}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.chatBody,
          embedded && {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {!embedded && hiveProfile.data ? (
          <View style={[styles.hiveInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Hive: {hiveProfile.data.hivePeers.length} peers ·{" "}
              {hiveProfile.data.supportsHiveConsult ? "consult enabled" : "solo mode"}
              {hiveProfile.data.capabilities.webSearch ? " · web search" : ""}
            </Text>
          </View>
        ) : null}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: 16 + overlap.scrollPaddingBottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === "user"
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.aiBubble, { backgroundColor: colors.background, borderColor: colors.border }],
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: msg.role === "user" ? "#fff" : colors.foreground },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          ))}
          {loading ? (
            <View style={styles.typingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 13 }}>Waiting for reply…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.composerDock,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: overlap.dockPaddingBottom,
            },
          ]}
        >
          {!embedded ? (
            <Pressable
              onPress={() => setShowExtras((v) => !v)}
              style={[styles.extrasToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}
              hitSlop={4}
            >
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>
                {showExtras ? "Hide voice, hive & extras" : "Voice, hive & extras"}
              </Text>
            </Pressable>
          ) : null}

          {!embedded && showExtras ? (
        <>
          {!isAssociateAi ? (
            <Pressable
              onPress={() => setHiveMode((v) => !v)}
              style={[
                styles.hiveToggle,
                { borderColor: colors.border, backgroundColor: hiveMode ? colors.primary : colors.surface },
              ]}
            >
              <Text style={{ color: hiveMode ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {hiveMode ? "🐝 Hive mode ON" : "🐝 Hive mode — consult peer specialists"}
              </Text>
            </Pressable>
          ) : null}

          {supportsVoice ? (
            <Pressable
              onPress={() => void speakLastReply()}
              disabled={voiceMutation.isPending || loading || buyAffiliateVoice.isPending}
              style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 0 }]}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {voiceMutation.isPending || buyAffiliateVoice.isPending
                  ? "🎙️ Synthesizing voice…"
                  : isAssociateAi
                    ? hasPaidVoice
                      ? "🎙️ Hear Associate AI"
                      : `🎙️ Voice pack $${premium.data?.affiliateVoicePriceUsd ?? "2.99"}`
                    : hasTalkTime
                      ? `🎙️ Voice — ${talkMinutes} min left`
                      : "🎙️ Voice — buy talk time"}
              </Text>
              {voiceStatus ? (
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{voiceStatus}</Text>
              ) : null}
            </Pressable>
          ) : null}

          {!isAssociateAi ? (
            <Pressable
              onPress={() => void (videoActive ? stopVideoTalk() : startVideoTalk())}
              disabled={assertVideo.isPending || buyVideo.isPending}
              style={[
                styles.hiveToggle,
                {
                  borderColor: colors.border,
                  backgroundColor: videoActive ? colors.primary : colors.surface,
                  marginTop: 0,
                },
              ]}
            >
              <Text style={{ color: videoActive ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {videoActive ? "📹 Video talk ON" : "📹 Video talk"}
              </Text>
            </Pressable>
          ) : null}

          {handoffs.data?.suggestions.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, marginVertical: 4 }}>
              <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 8 }}>
                {handoffs.data.suggestions.map((h) => (
                  <Pressable
                    key={h.targetCreatorId}
                    onPress={() => {
                      if (h.route.startsWith("/3d")) {
                        router.push("/3d-workspace" as never);
                      } else {
                        router.push({
                          pathname: "/(tabs)/ais",
                          params: { ai: h.targetCreatorId, prompt: h.prefillPrompt },
                        } as never);
                      }
                    }}
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>
                      → {h.targetName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}
        </>
          ) : null}

          {awaitingPitchConsent ? (
            <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 4, paddingBottom: 6 }}>
              <Pressable
                onPress={() => {
                  setAwaitingPitchConsent(false);
                  void sendChatMessage("yes");
                }}
                style={[styles.pitchBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Yes — show offer</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAwaitingPitchConsent(false);
                  void sendChatMessage("no");
                }}
                style={[styles.pitchBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>No thanks</Text>
              </Pressable>
            </View>
          ) : null}

          {sendStatus ? (
            <View
              style={[
                styles.sendStatus,
                {
                  backgroundColor: loading ? `${colors.primary}18` : `${colors.error}18`,
                  borderColor: loading ? colors.primary : colors.error,
                },
              ]}
            >
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              <Text
                style={{
                  flex: 1,
                  color: loading ? colors.primary : colors.error,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                {sendStatus}
              </Text>
            </View>
          ) : null}

          {embedded && apiReachable === false ? (
            <Text style={{ color: colors.error, fontSize: 11, paddingHorizontal: 4, paddingBottom: 6 }}>
              API offline — run pnpm dev on your PC
            </Text>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type a message…"
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!loading}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if (inputText.trim() && !loading) void sendChatMessage(inputText);
              }}
            />
            <Pressable
              onPress={() => void sendChatMessage(inputText)}
              disabled={loading || !inputText.trim()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: loading || !inputText.trim() ? colors.muted : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                  minWidth: 72,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendLabel}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  chatBody: { flex: 1, minHeight: 0 },
  composerDock: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { fontSize: 22 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#fff" },
  hiveInfo: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeButton: { padding: 4 },
  closePlaceholder: { width: 28 },
  messages: { flex: 1 },
  messagesContent: { padding: 12, paddingBottom: 16, gap: 10, flexGrow: 1 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  bubble: { maxWidth: "88%", borderRadius: 16, padding: 12 },
  userBubble: { alignSelf: "flex-end" },
  aiBubble: { alignSelf: "flex-start", borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  hiveToggle: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  extrasToggle: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  pitchBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  sendStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 4,
  },
  apiBanner: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sendLabel: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
