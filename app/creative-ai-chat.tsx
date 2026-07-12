import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
  attachments?: { type: "image" | "audio"; url: string }[];
}

interface CreativeSession {
  id: string;
  type: "music" | "art" | "writing";
  title: string;
  description: string;
  startedAt: number;
}

export default function CreativeAIChat() {
  const colors = useColors();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "🎨 Welcome to AI Creative Muse! I'm here to help you with music composition, art techniques, and creative writing. What would you like to work on today?\n\n📍 Choose a focus:\n• 🎵 Music Composition\n• 🖼️ Art & Design\n• ✍️ Creative Writing",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionType, setSessionType] = useState<"music" | "art" | "writing" | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSessionSelect = (type: "music" | "art" | "writing") => {
    setSessionType(type);
    setShowSessionModal(false);

    const sessionMessages: Record<string, string> = {
      music: "🎵 Music Composition Mode\n\nLet's create something amazing! I can help you with:\n• Chord progressions and music theory\n• Melody ideas and composition techniques\n• Genre-specific guidance\n• Arrangement suggestions\n\nWhat kind of music are you interested in creating?",
      art: "🖼️ Art & Design Mode\n\nLet's explore your artistic vision! I can assist with:\n• Drawing and painting techniques\n• Color theory and composition\n• Digital art tools and workflows\n• Design principles and inspiration\n\nWhat's your artistic focus today?",
      writing: "✍️ Creative Writing Mode\n\nLet's craft your story! I can help with:\n• Character development and dialogue\n• Plot structure and pacing\n• Writing prompts and inspiration\n• Editing and refinement tips\n\nWhat would you like to write about?",
    };

    const newMessage: ChatMessage = {
      id: `session-${Date.now()}`,
      role: "ai",
      content: sessionMessages[type],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses: Record<string, string[]> = {
        music: [
          "🎵 Great idea! For a major key progression, try: C - F - G - C. This is a classic progression used in many popular songs.\n\n💡 Tips:\n• The F chord adds warmth\n• G creates tension before resolving to C\n• Try playing with different tempos\n\nWould you like to explore variations?",
          "🎼 Excellent! Let me suggest some melody techniques:\n• Use intervals of 3-5 semitones for smooth melodies\n• Create a hook that repeats every 4-8 bars\n• Vary the rhythm to keep it interesting\n\nWhat tempo are you thinking?",
          "🎹 Nice direction! For arrangement:\n• Start simple with drums and bass\n• Add melodic elements gradually\n• Use dynamics to build interest\n• Leave space for the vocals\n\nHow many bars are you planning?",
        ],
        art: [
          "🎨 Wonderful approach! For color harmony:\n• Complementary colors create contrast\n• Analogous colors feel cohesive\n• Use the 60-30-10 rule: 60% dominant, 30% secondary, 10% accent\n\n✨ Try sketching with these colors first!",
          "🖌️ Great composition idea! Remember:\n• Rule of thirds creates balance\n• Leading lines guide the viewer's eye\n• Negative space is just as important\n• Depth comes from layering\n\nWhat's your focal point?",
          "🌈 Excellent! For digital art:\n• Start with rough sketches\n• Build up layers gradually\n• Use blend modes creatively\n• Save versions as you progress\n\nWhat software are you using?",
        ],
        writing: [
          "✍️ Fantastic! For character development:\n• Give them clear motivations\n• Show their flaws and growth\n• Use dialogue to reveal personality\n• Create memorable quirks\n\nWhat's your protagonist's main goal?",
          "📖 Great plot point! For pacing:\n• Establish stakes early\n• Build tension gradually\n• Use plot twists sparingly\n• Vary scene length for rhythm\n\nHow many chapters are you planning?",
          "💭 Excellent dialogue idea! Tips:\n• Each character has unique speech patterns\n• Subtext reveals true emotions\n• Use action beats to break dialogue\n• Read it aloud to check flow\n\nWhat's the emotional tone?",
        ],
      };

      const typeResponses = aiResponses[sessionType || "music"] || aiResponses.music;
      const randomResponse = typeResponses[Math.floor(Math.random() * typeResponses.length)];

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "ai",
        content: randomResponse,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setLoading(false);
    }, 1000);
  }, [inputText, sessionType]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              AI Creative Muse
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              {sessionType ? `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Mode` : "Select a mode"}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowSessionModal(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <IconSymbol name="ellipsis.circle" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 12, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={{
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                marginHorizontal: 4,
                gap: 8,
              }}
            >
              {msg.role === "ai" && (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🎨</Text>
                </View>
              )}

              <View
                style={{
                  flex: 1,
                  backgroundColor: msg.role === "user" ? colors.primary : colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: msg.role === "user" ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    color: msg.role === "user" ? "#FFFFFF" : colors.foreground,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {msg.content}
                </Text>
                <Text
                  style={{
                    color: msg.role === "user" ? "rgba(255,255,255,0.7)" : colors.muted,
                    fontSize: 11,
                    marginTop: 6,
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              {msg.role === "user" && (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 18 }}>👤</Text>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>🎨</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 14 }}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 12,
            paddingVertical: 12,
            gap: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontSize: 14,
                  paddingRight: 8,
                }}
                placeholder="Share your creative idea..."
                placeholderTextColor={colors.muted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
            </View>

            <Pressable
              onPress={handleSendMessage}
              disabled={!inputText.trim() || loading}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: inputText.trim() && !loading ? colors.primary : colors.border,
                justifyContent: "center",
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <IconSymbol
                name="paperplane.fill"
                size={20}
                color={inputText.trim() && !loading ? "#FFFFFF" : colors.muted}
              />
            </Pressable>
          </View>

          <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center" }}>
            ⚠️ AI-Generated Content: For entertainment and educational purposes only
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Session Modal */}
      <Modal visible={showSessionModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 20,
              gap: 16,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Choose Creative Focus
            </Text>

            {[
              { type: "music" as const, emoji: "🎵", label: "Music Composition" },
              { type: "art" as const, emoji: "🖼️", label: "Art & Design" },
              { type: "writing" as const, emoji: "✍️", label: "Creative Writing" },
            ].map((option) => (
              <Pressable
                key={option.type}
                onPress={() => handleSessionSelect(option.type)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderWidth: 2,
                  borderColor: sessionType === option.type ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                })}
              >
                <Text style={{ fontSize: 24 }}>{option.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {option.label}
                  </Text>
                </View>
                {sessionType === option.type && (
                  <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowSessionModal(false)}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
