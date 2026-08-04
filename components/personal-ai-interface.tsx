import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import PersonalAIAssistant, {
  PersonalAIProfile,
  WebSearchResult,
} from "@/lib/personal-ai-assistant";

interface PersonalAIInterfaceProps {
  creatorId: string;
  onClose?: () => void;
}

const mockProfile: PersonalAIProfile = {
  id: "ai-personal-001",
  creatorId: "creator-001",
  name: "ContentMate",
  personality: "Friendly, helpful, creative",
  learningData: {
    contentHistory: [],
    discussionHistory: [],
    preferences: {
      favoriteTopics: ["digital art", "tutorials"],
      contentStyle: "Educational",
      uploadFrequency: "Weekly",
      targetAudience: "Artists and creators",
      monetizationGoals: ["sponsorships", "subscriptions"],
    },
    style: {
      tone: "Professional yet friendly",
      format: "Video tutorials",
      colorPalette: ["#6366F1", "#EC4899", "#14B8A6"],
      fontPreference: "Modern sans-serif",
      pacing: "Medium",
    },
    topics: ["digital art", "design", "tutorials", "creativity"],
    lastUpdated: new Date().toISOString(),
  },
  capabilities: [
    "Web search",
    "Content analysis",
    "Video editing suggestions",
    "Audio production help",
    "Graph generation",
    "Image creation",
    "Content scheduling",
    "Analytics review",
  ],
  voiceSettings: {
    language: "English",
    accent: "Neutral",
    speed: 1.0,
    pitch: 1.0,
  },
};

export function PersonalAIInterface({ creatorId, onClose }: PersonalAIInterfaceProps) {
  const colors = useColors();
  const [ai] = useState(() => new PersonalAIAssistant(mockProfile));
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([
    {
      role: "ai",
      text: "Hi! I'm ContentMate, your personal AI assistant. I'm here to help you create amazing content. What would you like to do today?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<WebSearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    setLoading(true);

    const userMessage = inputText;
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInputText("");

    try {
      const response = await ai.processVoiceCommand(userMessage);
      setMessages((prev) => [...prev, { role: "ai", text: response.text }]);

      if (response.actions.includes("search_web")) {
        const query = userMessage.replace(/search|find/i, "").trim();
        const results = await ai.searchWeb(query);
        setSearchResults(results);
        setShowSearch(true);
      }

      if (response.suggestions.length > 0) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text: `Here are some suggestions:\n• ${response.suggestions.join("\n• ")}`,
            },
          ]);
        }, 500);
      }
    } catch (error) {
      console.error("Error processing command:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleQuickAction = async (action: string) => {
    setInputText(action);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleSearchResult = (result: WebSearchResult) => {
    Alert.alert(result.title, result.snippet, [
      {
        text: "Open URL",
        onPress: () => {
          if (Platform.OS === "web") {
            window.open(result.url, "_blank");
          } else {
            Alert.alert("URL", result.url);
          }
        },
      },
      { text: "Close", onPress: () => {} },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>ContentMate</Text>
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.headerTitle}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerSubtitle}>Your personal AI content assistant</Text>
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

        {showSearch && searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            <Text style={[styles.searchTitle, { color: colors.foreground }]}>
              Search Results:
            </Text>
            {searchResults.map((result, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSearchResult(result)}
                style={[
                  styles.searchResultCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.searchResultTitle, { color: colors.foreground }]}
                >
                  {result.title}
                </Text>
                <Text style={[styles.searchResultMeta, { color: colors.muted }]}>
                  {result.source}
                </Text>
                <Text style={[styles.searchResultSnippet, { color: colors.foreground }]}>
                  {result.snippet}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {messages.length === 1 ? (
        <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
          <Text style={[styles.quickActionsLabel, { color: colors.muted }]}>
            QUICK ACTIONS
          </Text>
          <View style={styles.quickActionsRow}>
            {[
              "Search web",
              "Edit video",
              "Generate image",
              "Create graph",
              "Get suggestions",
            ].map((action) => (
              <TouchableOpacity
                key={action}
                onPress={() => handleQuickAction(action)}
                style={[
                  styles.quickActionChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
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
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={loading || !inputText.trim()}
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.sendButtonText}>🎤</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.inputHint, { color: colors.muted }]}>
          Tip: Ask me to search, edit, create, or suggest content ideas!
        </Text>
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
  searchResults: {
    width: "100%",
    gap: 8,
    marginTop: 8,
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  searchResultCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultMeta: {
    fontSize: 11,
  },
  searchResultSnippet: {
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 18,
  },
  inputHint: {
    fontSize: 11,
    lineHeight: 16,
  },
});
