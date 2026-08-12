import React, { useState, useRef, useCallback } from "react";
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
import { speakText } from "@/lib/azure-tts-service";
import { useAiChatSync, type SyncedChatMessage } from "@/hooks/use-ai-chat-sync";
import { useAiChatOutbox } from "@/hooks/use-ai-chat-outbox";
import { useAuth } from "@/lib/auth-context";

interface ChatMessage {
  id?: string;
  role: "user" | "ai";
  text: string;
  pending?: boolean;
}

interface PersonalAIInterfaceProps {
  creatorId: string;
  onClose?: () => void;
  compact?: boolean;
  quickActions?: string[];
  welcomeMessage?: string;
}

export function PersonalAIInterface({
  creatorId = "contentmate",
  onClose,
  compact = false,
  quickActions,
  welcomeMessage,
}: PersonalAIInterfaceProps) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const defaultWelcome =
    welcomeMessage ??
    "Hi! I'm ContentMate, your personal AI assistant. I understand any language — just write or speak naturally. I'm here to help you create amazing content. What would you like to do today?";
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: defaultWelcome,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const loadingRef = useRef(false);

  const applySyncedMessages = useCallback(
    (synced: SyncedChatMessage[]) => {
      if (loadingRef.current || synced.length === 0) return;
      setMessages(
        synced.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
        })),
      );
    },
    [],
  );

  const { connected: chatSyncConnected, refetch: refetchChatThread } = useAiChatSync({
    creatorId,
    enabled: isAuthenticated,
    onSync: applySyncedMessages,
  });

  const { enqueue: enqueueOutbox } = useAiChatOutbox({
    creatorId,
    enabled: isAuthenticated,
    onFlushed: () => void refetchChatThread(),
  });

  const chatMutation = trpc.aiCreators.sendMessage.useMutation();
  const voiceMutation = trpc.aiCreators.synthesizeVoice.useMutation();
  const premium = trpc.partnerDashboard.premiumMediaStatus.useQuery();
  const buyVoice = trpc.partnerDashboard.purchaseCreatorVoice.useMutation({
    onSuccess: () => void premium.refetch(),
  });
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendChatMessage = useCallback(
    async (rawText: string) => {
      const userMessage = rawText.trim().slice(0, 2000);
      if (!userMessage || loading) return;

      loadingRef.current = true;
      setLoading(true);
      const clearedInput = rawText === inputText;
      if (clearedInput) {
        setInputText("");
      }

      if (isAuthenticated && !chatSyncConnected) {
        const item = await enqueueOutbox({
          creatorId,
          message: userMessage,
          channel: "creators",
        });
        setMessages((prev) => [
          ...prev,
          { role: "user", text: userMessage, id: item.id, pending: true },
        ]);
        loadingRef.current = false;
        setLoading(false);
        scrollToBottom();
        return;
      }

      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);

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
        });

        setMessages((prev) => [...prev, { role: "ai", text: result.reply }]);
        void refetchChatThread();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.";
        setMessages((prev) => [...prev, { role: "ai", text: message }]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        scrollToBottom();
      }
    },
    [chatMutation, chatSyncConnected, creatorId, enqueueOutbox, inputText, isAuthenticated, loading, messages, scrollToBottom, refetchChatThread],
  );

  const handleSendMessage = () => {
    void sendChatMessage(inputText);
  };

  const handleQuickAction = (action: string) => {
    void sendChatMessage(action);
  };

  const handleVoiceReply = async () => {
    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    if (!lastAi) return;
    if (!premium.data?.creatorVoice && !buyVoice.isSuccess) {
      buyVoice.mutate(undefined, {
        onSuccess: () => void handleVoiceReply(),
      });
      return;
    }
    setVoiceStatus("Speaking…");
    try {
      if (Platform.OS === "web") {
        const res = await voiceMutation.mutateAsync({
          creatorId: "contentmate",
          text: lastAi.text,
        });
        if (res.success && res.audioUrl) {
          const audio = new Audio(res.audioUrl);
          await audio.play();
        }
      } else {
        await speakText(lastAi.text);
      }
      setVoiceStatus(null);
    } catch (e) {
      setVoiceStatus(e instanceof Error ? e.message : "Voice failed");
    }
  };

  const hasVoice =
    Boolean(premium.data?.creatorVoice) ||
    buyVoice.isSuccess;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>ContentMate</Text>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.headerTitle}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerSubtitle}>Your multilingual AI content assistant</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, idx) => (
          <View
            key={msg.id ?? idx}
            style={[
              styles.messageRow,
              msg.role === "user" ? styles.messageRowUser : styles.messageRowAi,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? { backgroundColor: colors.primary }
                  : {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: msg.role === "user" ? "#fff" : colors.foreground },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {loading ? (
          <View style={styles.messageRowAi}>
            <View
              style={[
                styles.messageBubble,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {messages.length === 1 ? (
        <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
          <Text style={[styles.quickActionsLabel, { color: colors.muted }]}>
            QUICK ACTIONS
          </Text>
          <View style={styles.quickActionsRow}>
            {(quickActions ?? [
              "Help me brainstorm video ideas",
              "Suggest a content calendar",
              "How do I grow my audience?",
            ]).map((action) => (
              <TouchableOpacity
                key={action}
                onPress={() => handleQuickAction(action)}
                disabled={loading}
                style={[
                  styles.quickActionChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={[styles.quickActionText, { color: colors.foreground }]}>
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.inputArea,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Tell me what you need..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!loading}
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={loading || !inputText.trim()}
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary,
                opacity: loading || !inputText.trim() ? 0.5 : 1,
              },
            ]}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.inputHint, { color: colors.muted }]}>
          Gemini 1.5 Flash · understands 100+ languages
        </Text>
        <Pressable
          onPress={() => void handleVoiceReply()}
          disabled={voiceMutation.isPending || buyVoice.isPending}
          style={[styles.voiceBtn, { borderColor: colors.primary }]}
        >
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
            {buyVoice.isPending || voiceMutation.isPending
              ? "…"
              : hasVoice
                ? "🎙️ Hear ContentMate (voice pack active)"
                : `🎙️ Pay $${premium.data?.creatorVoicePriceUsd ?? "2.99"} — speak with ContentMate`}
          </Text>
        </Pressable>
        {voiceStatus ? (
          <Text style={{ color: colors.muted, fontSize: 11 }}>{voiceStatus}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  rootCompact: {
    flex: 1,
    minHeight: 400,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    flexShrink: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  closeButton: {
    padding: 4,
  },
  messagesScroll: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  messageRow: {
    width: "100%",
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  messageRowAi: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  quickActions: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  quickActionsLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  quickActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickActionChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputArea: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  inputHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  voiceBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
});
