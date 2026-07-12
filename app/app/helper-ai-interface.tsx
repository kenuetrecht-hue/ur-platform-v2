/**
 * Helper AI Interface Component
 * UI for human content creators to interact with Tier 2 Helper AI
 * Features: voice chat, text input, content tools, web search, transcripts
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  speaker: "creator" | "helper_ai";
  text: string;
  timestamp: Date;
  audioUrl?: string;
}

interface HelperAIState {
  conversationId: string | null;
  messages: Message[];
  isRecording: boolean;
  isPlaying: boolean;
  inputText: string;
  selectedTab: "chat" | "tools" | "search" | "settings";
  isLoading: boolean;
}

// ============================================================================
// HELPER AI INTERFACE COMPONENT
// ============================================================================

export default function HelperAIInterface() {
  const colors = useColors();
  const [state, setState] = useState<HelperAIState>({
    conversationId: null,
    messages: [],
    isRecording: false,
    isPlaying: false,
    inputText: "",
    selectedTab: "chat",
    isLoading: false,
  });

  const [audioSettings, setAudioSettings] = useState({
    voiceGender: "female",
    voiceAccent: "american",
    speechRate: 1.0,
    volume: 80,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleStartConversation = () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      conversationId: `conv-${Date.now()}`,
    }));

    // Simulate conversation start
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        messages: [
          {
            id: "msg-1",
            speaker: "helper_ai",
            text: "Hello! I'm your Helper AI. How can I assist you with your content today?",
            timestamp: new Date(),
          },
        ],
      }));
    }, 500);
  };

  const handleSendMessage = () => {
    if (!state.inputText.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      speaker: "creator",
      text: state.inputText,
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      inputText: "",
      isLoading: true,
    }));

    // Simulate AI response
    setTimeout(() => {
      const response: Message = {
        id: `msg-${Date.now() + 1}`,
        speaker: "helper_ai",
        text: `I understand you said: "${newMessage.text}". How would you like me to help?`,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, response],
        isLoading: false,
      }));
    }, 800);
  };

  const handleStartRecording = () => {
    setState((prev) => ({ ...prev, isRecording: true }));
  };

  const handleStopRecording = () => {
    setState((prev) => ({ ...prev, isRecording: false }));
    // Simulate voice message
    const voiceMessage: Message = {
      id: `msg-${Date.now()}`,
      speaker: "creator",
      text: "[Voice message received]",
      timestamp: new Date(),
      audioUrl: "https://example.com/audio.mp3",
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, voiceMessage],
    }));
  };

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  const renderChatTab = () => (
    <View className="flex-1">
      {state.conversationId ? (
        <>
          {/* Message History */}
          <ScrollView
            className="flex-1 p-4"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {state.messages.map((msg) => (
              <View
                key={msg.id}
                className={cn(
                  "mb-4 rounded-lg p-3 max-w-xs",
                  msg.speaker === "creator"
                    ? "self-end bg-primary"
                    : "self-start bg-surface"
                )}
              >
                <Text
                  className={cn(
                    "text-sm",
                    msg.speaker === "creator"
                      ? "text-background"
                      : "text-foreground"
                  )}
                >
                  {msg.text}
                </Text>
                <Text
                  className={cn(
                    "text-xs mt-1",
                    msg.speaker === "creator"
                      ? "text-background opacity-70"
                      : "text-muted"
                  )}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            ))}

            {state.isLoading && (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator color={colors.primary} />
                <Text className="text-muted text-sm">Helper AI is typing...</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View className="border-t border-border p-4 gap-3">
            {/* Voice Controls */}
            <View className="flex-row gap-2 justify-center">
              <TouchableOpacity
                onPress={
                  state.isRecording
                    ? handleStopRecording
                    : handleStartRecording
                }
                className={cn(
                  "px-6 py-3 rounded-full",
                  state.isRecording ? "bg-error" : "bg-primary"
                )}
              >
                <Text className="text-background font-semibold text-center">
                  {state.isRecording ? "Stop Recording" : "🎤 Record"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Text Input */}
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholder="Type your message..."
                placeholderTextColor={colors.muted}
                value={state.inputText}
                onChangeText={(text) =>
                  setState((prev) => ({ ...prev, inputText: text }))
                }
                editable={!state.isLoading}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={state.isLoading || !state.inputText.trim()}
                className="bg-primary px-4 py-3 rounded-lg justify-center"
              >
                <Text className="text-background font-semibold">Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <View className="flex-1 justify-center items-center gap-4">
          <Text className="text-2xl font-bold text-foreground">
            Start a Conversation
          </Text>
          <Text className="text-muted text-center px-4">
            Begin chatting with your Helper AI for writing, editing, and content
            assistance
          </Text>
          <TouchableOpacity
            onPress={handleStartConversation}
            className="bg-primary px-8 py-4 rounded-full"
          >
            <Text className="text-background font-semibold">
              Start Conversation
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderToolsTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-foreground mb-4">
        Content Tools
      </Text>

      {/* Content Templates */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3">
          Templates
        </Text>
        {["Blog Post", "Email", "Social Media", "Newsletter", "Book Chapter"].map(
          (template) => (
            <Pressable
              key={template}
              className="bg-surface p-4 rounded-lg mb-2 border border-border"
            >
              <Text className="text-foreground font-medium">{template}</Text>
            </Pressable>
          )
        )}
      </View>

      {/* Editing Tools */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3">
          Editing Tools
        </Text>
        {[
          "Grammar Check",
          "Tone Analysis",
          "Readability Score",
          "Plagiarism Check",
        ].map((tool) => (
          <Pressable
            key={tool}
            className="bg-surface p-4 rounded-lg mb-2 border border-border"
          >
            <Text className="text-foreground font-medium">{tool}</Text>
          </Pressable>
        ))}
      </View>

      {/* Formatting Options */}
      <View>
        <Text className="text-lg font-semibold text-foreground mb-3">
          Formatting
        </Text>
        {["Markdown", "HTML", "PDF", "DOCX", "EPUB"].map((format) => (
          <Pressable
            key={format}
            className="bg-surface p-4 rounded-lg mb-2 border border-border"
          >
            <Text className="text-foreground font-medium">{format}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  const renderSearchTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-foreground mb-4">
        Web Search
      </Text>

      <View className="gap-3 mb-6">
        <TextInput
          className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
          placeholder="Search the web..."
          placeholderTextColor={colors.muted}
        />
        <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg">
          <Text className="text-background font-semibold text-center">
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Searches */}
      <Text className="text-lg font-semibold text-foreground mb-3">
        Recent Searches
      </Text>
      {[
        "Content marketing strategies",
        "SEO best practices",
        "Social media trends",
      ].map((search) => (
        <Pressable
          key={search}
          className="bg-surface p-4 rounded-lg mb-2 border border-border"
        >
          <Text className="text-foreground">{search}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-foreground mb-4">
        Audio Settings
      </Text>

      {/* Voice Gender */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3">
          Voice Gender
        </Text>
        {["Male", "Female", "Neutral"].map((gender) => (
          <Pressable
            key={gender}
            className={cn(
              "p-4 rounded-lg mb-2 border",
              audioSettings.voiceGender === gender.toLowerCase()
                ? "bg-primary border-primary"
                : "bg-surface border-border"
            )}
          >
            <Text
              className={cn(
                "font-medium",
                audioSettings.voiceGender === gender.toLowerCase()
                  ? "text-background"
                  : "text-foreground"
              )}
            >
              {gender}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Voice Accent */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3">
          Accent
        </Text>
        {["American", "British", "Australian"].map((accent) => (
          <Pressable
            key={accent}
            className={cn(
              "p-4 rounded-lg mb-2 border",
              audioSettings.voiceAccent === accent.toLowerCase()
                ? "bg-primary border-primary"
                : "bg-surface border-border"
            )}
          >
            <Text
              className={cn(
                "font-medium",
                audioSettings.voiceAccent === accent.toLowerCase()
                  ? "text-background"
                  : "text-foreground"
              )}
            >
              {accent}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Speech Rate */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-foreground mb-3">
          Speech Rate: {audioSettings.speechRate.toFixed(1)}x
        </Text>
        <View className="flex-row gap-2">
          {[0.5, 0.75, 1.0, 1.25, 1.5].map((rate) => (
            <Pressable
              key={rate}
              onPress={() =>
                setAudioSettings((prev) => ({ ...prev, speechRate: rate }))
              }
              className={cn(
                "px-3 py-2 rounded-lg border",
                audioSettings.speechRate === rate
                  ? "bg-primary border-primary"
                  : "bg-surface border-border"
              )}
            >
              <Text
                className={cn(
                  "text-sm font-medium",
                  audioSettings.speechRate === rate
                    ? "text-background"
                    : "text-foreground"
                )}
              >
                {rate}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 flex-col">
        {/* Header */}
        <View className="border-b border-border p-4">
          <Text className="text-2xl font-bold text-foreground">
            Helper AI Assistant
          </Text>
          <Text className="text-muted text-sm mt-1">
            Your personal content creation assistant
          </Text>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row border-b border-border">
          {(
            [
              { key: "chat", label: "Chat" },
              { key: "tools", label: "Tools" },
              { key: "search", label: "Search" },
              { key: "settings", label: "Settings" },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() =>
                setState((prev) => ({ ...prev, selectedTab: tab.key }))
              }
              className={cn(
                "flex-1 py-3 px-4 border-b-2",
                state.selectedTab === tab.key
                  ? "border-primary"
                  : "border-transparent"
              )}
            >
              <Text
                className={cn(
                  "text-center font-semibold",
                  state.selectedTab === tab.key
                    ? "text-primary"
                    : "text-muted"
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        {state.selectedTab === "chat" && renderChatTab()}
        {state.selectedTab === "tools" && renderToolsTab()}
        {state.selectedTab === "search" && renderSearchTab()}
        {state.selectedTab === "settings" && renderSettingsTab()}
      </View>
    </ScreenContainer>
  );
}
