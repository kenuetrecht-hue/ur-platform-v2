import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  initializeVoiceConversation,
  addMessageToConversation,
  generateAIResponse,
  textToSpeech,
  getConversationStats,
  type ConversationContext,
  type VoiceMessage,
} from "@/lib/voice-conversation-service";

export interface VoiceChatProps {
  creatorId: string;
  aiName: string;
  onClose?: () => void;
}

export function VoiceChat({ creatorId, aiName, onClose }: VoiceChatProps) {
  const colors = useColors();
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const micRef = useRef<any>(null);

  // Initialize conversation
  useEffect(() => {
    const newContext = initializeVoiceConversation(creatorId, aiName);
    setContext(newContext);
  }, [creatorId, aiName]);

  // Handle microphone press
  const handleMicPress = useCallback(async () => {
    if (!context) return;

    setIsListening(!isListening);

    if (!isListening) {
      // Start listening
      setCurrentTranscript("");
      setIsProcessing(true);

      // Simulate voice input capture
      setTimeout(async () => {
        const userInput = "Create a post about fitness trends";
        setCurrentTranscript(userInput);

        // Add user message to conversation
        const userMessage = addMessageToConversation(context, "creator", userInput);
        setMessages([...messages, userMessage]);

        // Generate AI response
        setIsProcessing(true);
        const aiResponse = await generateAIResponse(userInput, context);

        // Convert to speech
        const { audioUrl, duration } = await textToSpeech(aiResponse.text);

        // Add AI message to conversation
        const aiMessage = addMessageToConversation(context, "ai", aiResponse.text, audioUrl);
        aiMessage.duration = duration;

        setMessages([...messages, userMessage, aiMessage]);
        setIsProcessing(false);
        setIsListening(false);
        setCurrentTranscript("");

        // Auto-scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 1500);
    }
  }, [isListening, context, messages]);

  // Handle send text message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!context || !text.trim()) return;

      setIsProcessing(true);

      // Add user message
      const userMessage = addMessageToConversation(context, "creator", text);
      setMessages([...messages, userMessage]);

      // Generate AI response
      const aiResponse = await generateAIResponse(text, context);

      // Convert to speech
      const { audioUrl, duration } = await textToSpeech(aiResponse.text);

      // Add AI message
      const aiMessage = addMessageToConversation(context, "ai", aiResponse.text, audioUrl);
      aiMessage.duration = duration;

      setMessages([...messages, userMessage, aiMessage]);
      setIsProcessing(false);

      // Auto-scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    [context, messages]
  );

  const stats = context ? getConversationStats(context) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, gap: 12 }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
            🤖 {aiName}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {stats?.totalMessages || 0} messages
          </Text>
        </View>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={24} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
            <Text style={{ fontSize: 48 }}>👋</Text>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Start a conversation
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>
              Use the microphone to speak, or type a message below
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={{
                flexDirection: message.speaker === "creator" ? "row-reverse" : "row",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              {/* Avatar */}
              <Text style={{ fontSize: 24 }}>
                {message.speaker === "creator" ? "👤" : "🤖"}
              </Text>

              {/* Message bubble */}
              <View
                style={{
                  maxWidth: "75%",
                  backgroundColor:
                    message.speaker === "creator" ? colors.primary : colors.surface,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: message.speaker === "ai" ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color:
                      message.speaker === "creator" ? "#FFFFFF" : colors.foreground,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  {message.text}
                </Text>

                {/* Audio player for AI messages */}
                {message.speaker === "ai" && message.audioUrl && (
                  <Pressable
                    style={({ pressed }) => ({
                      marginTop: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      backgroundColor: colors.primary + "20",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <IconSymbol
                      name="speaker.wave.2.fill"
                      size={14}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Play Audio
                    </Text>
                  </Pressable>
                )}

                {/* Timestamp */}
                <Text
                  style={{
                    color:
                      message.speaker === "creator"
                        ? "rgba(255,255,255,0.7)"
                        : colors.muted,
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          ))
        )}

        {isProcessing && (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={{ fontSize: 24 }}>🤖</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                gap: 6,
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {aiName} is thinking...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Current transcript */}
      {currentTranscript && (
        <View
          style={{
            marginHorizontal: 12,
            padding: 10,
            backgroundColor: colors.primary + "15",
            borderRadius: 8,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>
            You said:
          </Text>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>
            &quot;{currentTranscript}&quot;
          </Text>
        </View>
      )}

      {/* Controls */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingBottom: 12,
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
        }}
      >
        {/* Microphone button */}
        <Pressable
          onPress={handleMicPress}
          disabled={isProcessing}
          style={({ pressed }) => ({
            backgroundColor: isListening ? colors.error : colors.primary,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: "center",
            gap: 6,
            opacity: pressed || isProcessing ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 24 }}>
            {isListening ? "🎙️" : isProcessing ? "⏳" : "🎤"}
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
            {isListening
              ? "Listening..."
              : isProcessing
                ? "Processing..."
                : "Tap to Speak"}
          </Text>
        </Pressable>

        {/* Quick actions */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => handleSendMessage("Create a post")}
            disabled={isProcessing}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed || isProcessing ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
              ✍️ Post
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSendMessage("Clip my video")}
            disabled={isProcessing}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed || isProcessing ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
              ✂️ Clip
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSendMessage("Generate a graph")}
            disabled={isProcessing}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              opacity: pressed || isProcessing ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
              📊 Graph
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
