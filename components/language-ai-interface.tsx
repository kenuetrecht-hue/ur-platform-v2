import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";

type LanguageMode = "chat" | "translate" | "learn";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

interface LanguageAIInterfaceProps {
  onClose?: () => void;
}

const POPULAR_LANGUAGES = [
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Mandarin Chinese",
  "Arabic",
  "Portuguese",
  "Korean",
  "Hindi",
  "Italian",
];

const LEARN_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export function LanguageAIInterface({ onClose }: LanguageAIInterfaceProps) {
  const colors = useColors();
  const overlap = useOverlapInsets({
    headerChromeHeight: LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT + 100,
  });
  const { isAuthenticated } = useAuth();
  const subAccess = trpc.aiSubscription.getAccess.useQuery(
    { creatorId: "linguamate" },
    { enabled: isAuthenticated },
  );
  const canChat = !isAuthenticated ? false : Boolean(subAccess.data?.hasAccess);
  const [mode, setMode] = useState<LanguageMode>("chat");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [learnLevel, setLearnLevel] =
    useState<(typeof LEARN_LEVELS)[number]>("beginner");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "¡Hola! I'm LinguaMate — your Universal Language Translator & Teacher. I understand 100+ languages. Switch modes above to translate, learn, or chat freely in any language.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const chatMutation = trpc.aiLanguage.chat.useMutation();
  const translateMutation = trpc.aiLanguage.translate.useMutation();
  const teachMutation = trpc.aiLanguage.teach.useMutation();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const buildHistory = useCallback(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "ai")
        .slice(-12)
        .map((m) => ({
          role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        })),
    [messages],
  );

  const sendMessage = useCallback(
    async (rawText: string) => {
      const userMessage = rawText.trim().slice(0, 4000);
      if (!userMessage || loading || !canChat) return;

      setLoading(true);
      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
      if (rawText === inputText) setInputText("");

      try {
        let reply = "";

        if (mode === "translate") {
          const result = await translateMutation.mutateAsync({
            text: userMessage,
            targetLanguage,
          });
          reply = result.translation;
        } else if (mode === "learn") {
          const result = await teachMutation.mutateAsync({
            targetLanguage,
            level: learnLevel,
            mode: "lesson",
            userMessage,
            history: buildHistory(),
          });
          reply = result.lesson;
        } else {
          const result = await chatMutation.mutateAsync({
            message: userMessage,
            history: buildHistory(),
            targetLanguage: targetLanguage || undefined,
          });
          reply = result.reply;
        }

        setMessages((prev) => [...prev, { role: "ai", text: reply }]);
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
    [
      buildHistory,
      chatMutation,
      inputText,
      learnLevel,
      loading,
      mode,
      scrollToBottom,
      targetLanguage,
      teachMutation,
      translateMutation,
      canChat,
    ],
  );

  const startLesson = (language: string) => {
    setTargetLanguage(language);
    setMode("learn");
    void sendMessage(`Start a ${learnLevel} lesson in ${language} with essential travel phrases.`);
  };

  const modePlaceholder: Record<LanguageMode, string> = {
    chat: "Ask in any language — I'll understand and respond...",
    translate: "Type text to translate (any language)...",
    learn: "Ask for a lesson, practice, or conversation drill...",
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={overlap.keyboardBehavior}
      keyboardVerticalOffset={overlap.keyboardVerticalOffset}
    >
      <View style={[styles.header, { backgroundColor: "#0d9488" }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>🌍 LinguaMate</Text>
            <Text style={styles.headerSubtitle}>
              Translator & Teacher · 100+ languages
            </Text>
          </View>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.headerTitle}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.modeRow}>
          {(["chat", "translate", "learn"] as LanguageMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.modeChip,
                mode === m && styles.modeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.modeChipText,
                  mode === m && styles.modeChipTextActive,
                ]}
              >
                {m === "chat" ? "Chat" : m === "translate" ? "Translate" : "Learn"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.languageBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.languageLabel, { color: colors.muted }]}>
          {mode === "translate" ? "Translate to" : "Focus language"}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.languageChips}>
            {POPULAR_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => setTargetLanguage(lang)}
                style={[
                  styles.langChip,
                  {
                    backgroundColor:
                      targetLanguage === lang ? "#0d9488" : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: targetLanguage === lang ? "#fff" : colors.foreground,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {mode === "learn" ? (
          <View style={styles.levelRow}>
            {LEARN_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setLearnLevel(level)}
                style={[
                  styles.levelChip,
                  {
                    backgroundColor:
                      learnLevel === level ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: learnLevel === level ? "#fff" : colors.foreground,
                    fontSize: 11,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesScroll}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: 16 + overlap.scrollPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.messageRow,
              msg.role === "user" ? styles.messageRowUser : styles.messageRowAi,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.role === "user"
                  ? { backgroundColor: "#0d9488" }
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
              <ActivityIndicator color="#0d9488" />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {messages.length <= 2 && mode === "learn" ? (
        <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
          <Text style={[styles.quickActionsLabel, { color: colors.muted }]}>
            START A LESSON
          </Text>
          <View style={styles.quickActionsRow}>
            {["Spanish", "French", "Japanese", "Arabic"].map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => startLesson(lang)}
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
                  {lang}
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
            paddingBottom: overlap.dockPaddingBottom,
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
            placeholder={modePlaceholder[mode]}
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={4000}
            editable={!loading && canChat}
            onSubmitEditing={() => void sendMessage(inputText)}
          />
          <TouchableOpacity
            onPress={() => void sendMessage(inputText)}
            disabled={loading || !inputText.trim() || !canChat}
            style={[
              styles.sendButton,
              {
                backgroundColor: "#0d9488",
                opacity: loading || !inputText.trim() || !canChat ? 0.5 : 1,
              },
            ]}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.inputHint, { color: colors.muted }]}>
          {canChat
            ? "Gemini 1.5 Flash · speaks & understands 100+ languages"
            : "Subscribe to LinguaMate above to start translating and learning."}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexShrink: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  modeChipActive: {
    backgroundColor: "#fff",
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  modeChipTextActive: {
    color: "#0d9488",
  },
  languageBar: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  languageLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  languageChips: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  langChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  levelRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  levelChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    maxWidth: "90%",
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
});
