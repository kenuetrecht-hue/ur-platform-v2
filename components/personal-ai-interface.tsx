import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import PersonalAIAssistant, { PersonalAIProfile, WebSearchResult } from "@/lib/personal-ai-assistant";

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

    // Add user message
    const userMessage = inputText;
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInputText("");

    try {
      // Process voice command
      const response = await ai.processVoiceCommand(userMessage);

      // Add AI response
      setMessages((prev) => [...prev, { role: "ai", text: response.text }]);

      // If search intent, perform search
      if (response.actions.includes("search_web")) {
        const query = userMessage.replace(/search|find/i, "").trim();
        const results = await ai.searchWeb(query);
        setSearchResults(results);
        setShowSearch(true);
      }

      // Show suggestions
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

    // Scroll to bottom
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
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-primary p-4 gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-background">ContentMate</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} className="p-2">
              <Text className="text-lg text-background">✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text className="text-sm text-background opacity-90">Your personal AI content assistant</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 p-4 gap-3"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            className={`gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <View
              className={`max-w-xs rounded-lg p-3 ${
                msg.role === "user" ? "bg-primary" : "bg-surface border border-border"
              }`}
            >
              <Text
                className={`text-base ${
                  msg.role === "user" ? "text-background" : "text-foreground"
                }`}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {loading && (
          <View className="items-start gap-2">
            <View className="bg-surface border border-border rounded-lg p-3">
              <ActivityIndicator color={colors.primary} />
            </View>
          </View>
        )}

        {/* Search Results */}
        {showSearch && searchResults.length > 0 && (
          <View className="gap-2 mt-4">
            <Text className="text-sm font-bold text-foreground">Search Results:</Text>
            {searchResults.map((result, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSearchResult(result)}
                className="bg-surface border border-border rounded-lg p-3 gap-1"
              >
                <Text className="font-semibold text-foreground text-sm">{result.title}</Text>
                <Text className="text-xs text-muted">{result.source}</Text>
                <Text className="text-xs text-foreground">{result.snippet}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <View className="px-4 py-3 gap-2 border-t border-border">
          <Text className="text-xs font-semibold text-muted uppercase">Quick Actions</Text>
          <View className="flex-row flex-wrap gap-2">
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
                className="bg-surface border border-border rounded-full px-3 py-2"
              >
                <Text className="text-xs font-semibold text-foreground">{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input */}
      <View className="p-4 gap-3 border-t border-border bg-surface">
        <View className="flex-row gap-2 items-end">
          <TextInput
            className="flex-1 bg-background border border-border rounded-lg p-3 text-foreground"
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
            className="bg-primary rounded-lg p-3 items-center justify-center"
          >
            <Text className="text-lg">🎤</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-muted">
          💡 Tip: Ask me to search, edit, create, or suggest content ideas!
        </Text>
      </View>
    </View>
  );
}
