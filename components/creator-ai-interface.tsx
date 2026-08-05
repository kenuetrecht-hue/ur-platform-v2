import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { isForgeSpecialist } from "@/lib/forge-specialists";
import { AFFILIATE_ASSOCIATE_ID } from "@/lib/affiliate-associate-catalog";
import { speakText } from "@/lib/azure-tts-service";
import { useRouter } from "expo-router";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export type CreatorAIInterfaceProps = {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  welcomeMessage?: string;
  initialPrompt?: string;
  onClose?: () => void;
};

export function CreatorAIInterface({
  creatorId,
  creatorName,
  creatorAvatar = "✨",
  welcomeMessage,
  initialPrompt,
  onClose,
}: CreatorAIInterfaceProps) {
  const colors = useColors();
  const router = useRouter();
  const defaultWelcome =
    welcomeMessage ??
    `Hi! I'm ${creatorName}. I understand any language — ask me anything in my area of expertise.`;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: defaultWelcome },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hiveMode, setHiveMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [awaitingPitchConsent, setAwaitingPitchConsent] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
  const hiveProfile = trpc.aiCreators.getHiveProfile.useQuery({ creatorId });
  const handoffs = trpc.aiCreators.getHandoffs.useQuery({ creatorId });
  const exportChat = trpc.aiCreators.exportChat.useMutation();
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
    setMessages([{ role: "ai", text: defaultWelcome }]);
    setInputText(initialPrompt ?? "");
  }, [creatorId, defaultWelcome, initialPrompt]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendChatMessage = useCallback(
    async (rawText: string) => {
      const userMessage = rawText.trim().slice(0, 2000);
      if (!userMessage || loading) return;

      setLoading(true);
      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
      if (rawText === inputText) {
        setInputText("");
      }

      try {
        const history = messages
          .filter((m) => m.role === "user" || m.role === "ai")
          .slice(-10)
          .map((m) => ({
            role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
            content: m.text,
          }));

        const result = await chatMutation.mutateAsync({
          creatorId,
          message: userMessage,
          history,
          useHiveConsult: hiveMode,
        });

        let replyText = result.reply;
        if (result.hiveConsulted?.length) {
          replyText += `\n\n🐝 Hive consulted: ${result.hiveConsulted.map((p) => p.name).join(", ")}`;
        }

        setMessages((prev) => [...prev, { role: "ai", text: replyText }]);
        setAwaitingPitchConsent(Boolean(result.pitchConsentRequest));
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.";
        setMessages((prev) => [...prev, { role: "ai", text: message }]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [chatMutation, creatorId, hiveMode, inputText, loading, messages, scrollToBottom],
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
      try {
        await buyTalk.mutateAsync({ packId: "standard_20" });
      } catch (error) {
        setVoiceStatus(error instanceof Error ? error.message : "Could not purchase talk time");
        return;
      }
    }

    setVoiceStatus(null);
    try {
      const result = await voiceMutation.mutateAsync({
        creatorId,
        text: lastAi.text.slice(0, 3000),
      });
      if (result.success) {
        setVoiceStatus(`🔊 ${result.persona} — ${Math.round(result.duration)}s audio ready`);
        if (typeof window !== "undefined" && result.audioUrl?.startsWith("data:")) {
          const audio = new window.Audio(result.audioUrl);
          void audio.play();
        } else if (Platform.OS !== "web") {
          await speakText(lastAi.text);
        }
      } else {
        setVoiceStatus(result.error ?? "Voice unavailable");
      }
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Voice failed");
    }
  }, [buyAffiliateVoice, buyTalk, creatorId, hasPaidVoice, hasTalkTime, isAssociateAi, messages, voiceMutation]);

  const startVideoTalk = useCallback(async () => {
    try {
      if (!hasTalkTime) {
        await buyVideo.mutateAsync({ packId: "standard_20" });
      }
      await assertVideo.mutateAsync({ creatorId });
      setVideoActive(true);
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Video talk unavailable");
    }
  }, [assertVideo, buyVideo, creatorId, hasTalkTime]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerAvatar}>{creatorAvatar}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {creatorName}
          </Text>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.headerTitle}>✕</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.closePlaceholder} />
          )}
        </View>
      </View>

      {hiveProfile.data ? (
        <View style={[styles.hiveInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            🐝 Hive: {hiveProfile.data.hivePeers.length} peers ·{" "}
            {hiveProfile.data.supportsHiveConsult ? "consult enabled" : "solo mode"}
            {hiveProfile.data.capabilities.webSearch ? " · web search" : ""}
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, index) => (
          <View
            key={`${index}-${msg.role}`}
            style={[
              styles.bubble,
              msg.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
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
          <ActivityIndicator style={{ marginTop: 8 }} color={colors.primary} />
        ) : null}
      </ScrollView>

      {!isAssociateAi ? (
      <TouchableOpacity
        onPress={() => setHiveMode((v) => !v)}
        style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: hiveMode ? colors.primary : colors.surface }]}
      >
        <Text style={{ color: hiveMode ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
          {hiveMode ? "🐝 Hive mode ON — peers will collaborate" : "🐝 Hive mode — tap to consult peer specialists"}
        </Text>
      </TouchableOpacity>
      ) : null}

      {supportsVoice ? (
        <TouchableOpacity
          onPress={() => void speakLastReply()}
          disabled={voiceMutation.isPending || loading || buyAffiliateVoice.isPending}
          style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 0 }]}
        >
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
            {voiceMutation.isPending || buyAffiliateVoice.isPending
              ? "🎙️ Synthesizing voice…"
              : isAssociateAi
                ? hasPaidVoice
                  ? "🎙️ Hear Associate AI (voice pack active)"
                  : `🎙️ Pay $${premium.data?.affiliateVoicePriceUsd ?? "2.99"} — speak with Associate AI`
                : hasTalkTime
                  ? `🎙️ Voice — ${talkMinutes} min left`
                  : "🎙️ Voice — buy talk time ($10 / 30 min)"}
          </Text>
          {voiceStatus ? (
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{voiceStatus}</Text>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {!isAssociateAi ? (
      <TouchableOpacity
        onPress={() => void (videoActive ? setVideoActive(false) : startVideoTalk())}
        disabled={assertVideo.isPending || buyVideo.isPending}
        style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: videoActive ? colors.primary : colors.surface, marginTop: 0 }]}
      >
        <Text style={{ color: videoActive ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
          {videoActive
            ? "📹 Video talk ON — tap to end"
            : buyVideo.isPending || assertVideo.isPending
              ? "Starting video…"
              : hasTalkTime
                ? `📹 Video talk (${talkMinutes} min left)`
                : `📹 Video talk — $${premium.data?.aiTalkStandardPriceUsd ?? "10.00"} / 30 min`}
        </Text>
      </TouchableOpacity>
      ) : null}

      {!isAssociateAi && videoActive ? (
        <View style={[styles.hiveInfo, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary, marginHorizontal: 8 }]}>
          <Text style={{ color: colors.foreground, fontSize: 11, lineHeight: 16 }}>
            Video talk session active. Continue chatting — your camera uses the web video layer when available. AI replies include voice when supported.
          </Text>
        </View>
      ) : null}

      {supportsVoice ? (
        <View style={[styles.hiveInfo, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary, marginHorizontal: 8 }]}>
          <Text style={{ color: colors.foreground, fontSize: 11, lineHeight: 16 }}>
            🤖 Build agent lives in the Build tab — templates, cloud run, GitHub, ZIP export, share links.
          </Text>
        </View>
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

      {awaitingPitchConsent ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 8, paddingBottom: 6 }}>
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

      <Pressable
        onPress={() => {
          exportChat.mutate(
            {
              creatorId,
              creatorName,
              messages,
            },
            {
              onSuccess: (r) => {
                if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(r.markdown);
                  setVoiceStatus(`Exported ${r.messageCount} messages to clipboard.`);
                } else {
                  setVoiceStatus(`Exported ${r.messageCount} messages (copy from server response).`);
                }
              },
            },
          );
        }}
        style={[styles.hiveToggle, { borderColor: colors.border, backgroundColor: colors.surface, marginTop: 0 }]}
      >
        <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
          📋 Export chat as Markdown
        </Text>
      </Pressable>

      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
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
        />
        <TouchableOpacity
          onPress={() => void sendChatMessage(inputText)}
          disabled={loading || !inputText.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: loading || !inputText.trim() ? colors.muted : colors.primary,
            },
          ]}
        >
          <Text style={styles.sendLabel}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
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
  messagesContent: { padding: 16, gap: 10, paddingBottom: 24 },
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
  pitchBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
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
