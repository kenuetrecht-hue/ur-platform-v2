import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { speakText } from "@/lib/azure-tts-service";
import { androidMicrophoneHandler } from "@/lib/android-microphone-handler";
import { ChatSideComposer, chatRailButtonStyle } from "@/components/chat-side-composer";
import { ChatComposerInput } from "@/components/chat-composer-input";
import { newestConversationFirst } from "@/lib/chat-newest-first";
import { useScrollChatToNewest } from "@/hooks/use-scroll-chat-to-newest";

interface VoiceChatMessage {
  id: string;
  type: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface VoiceChatInterfaceProps {
  aiName: string;
  aiCategory: string;
  creatorId?: string;
  onClose: () => void;
}

export function VoiceChatInterface({
  aiName,
  aiCategory,
  creatorId = "contentmate",
  onClose,
}: VoiceChatInterfaceProps) {
  const colors = useColors();
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [draft, setDraft] = useState("");
  const [textFocusNonce, setTextFocusNonce] = useState(0);
  const sendChat = trpc.aiCreators.sendMessage.useMutation();
  const recognitionRef = useRef<any>(null);
  const handleUserMessageRef = useRef<(text: string) => void>(() => undefined);
  const { ref: scrollViewRef } = useScrollChatToNewest(messages.length);

  // Initialize speech recognition with proper error handling
  useEffect(() => {
    try {
      // Check if running in browser environment
      if (typeof window === "undefined") {
        setError("Speech not available in this environment");
        return;
      }

      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Speech recognition not supported. Please use a modern browser (Chrome, Edge, Safari).");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.language = "en-US";

      // Handle speech recognition start
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      // Handle speech recognition results
      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        // Process final transcript
        if (finalTranscript) {
          handleUserMessageRef.current(finalTranscript.trim());
        }
      };

      // Handle speech recognition errors
      recognition.onerror = (event: any) => {
        let errorMessage = "Speech recognition error";
        
        switch (event.error) {
          case "no-speech":
            errorMessage = "No speech detected. Please try again.";
            break;
          case "audio-capture":
            errorMessage = "No microphone found. Please check your audio settings.";
            break;
          case "network":
            errorMessage = "Network error. Please check your connection.";
            break;
          case "not-allowed":
            errorMessage = "Microphone permission denied. Please allow microphone access in browser settings.";
            break;
          default:
            errorMessage = `Speech error: ${event.error}`;
        }
        
        setError(errorMessage);
        setIsListening(false);
      };

      // Handle speech recognition end
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      };
    } catch (err) {
      setError(`Failed to initialize speech recognition: ${err}`);
    }
  }, []);

  // Handle user message and get AI response
  const handleUserMessage = async (userText: string) => {
    if (!userText.trim()) return;

    const userMessage: VoiceChatMessage = {
      id: Date.now().toString(),
      type: "user",
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setTranscript("");
    setIsProcessing(true);

    try {
      // Generate AI response
      const history = messages
        .filter((m) => m.type === "user" || m.type === "ai")
        .slice(-10)
        .map((m) => ({
          role: m.type === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));
      const result = await sendChat.mutateAsync({
        creatorId,
        message: userText.trim().slice(0, 2000),
        history,
      });
      const aiResponse = result.reply;

      const aiMessage: VoiceChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        text: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Speak the AI response
      setIsSpeaking(true);
      try {
        await speakText(aiResponse);
      } catch (speakError) {
        console.warn("Failed to speak response:", speakError);
        // Continue even if speech fails
      } finally {
        setIsSpeaking(false);
      }
    } catch (err) {
      setError(`Error processing message: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  handleUserMessageRef.current = (text: string) => {
    void handleUserMessage(text);
  };

  // Start listening for speech
  const startListening = async () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not initialized");
      return;
    }

    try {
      // Check microphone permission on Android
      if (Platform.OS === "android") {
        const permissionStatus = await androidMicrophoneHandler.checkMicrophonePermission();
        if (!permissionStatus.granted) {
          const errorMsg = androidMicrophoneHandler.getSamsungErrorMessage(
            permissionStatus.error || "Permission denied"
          );
          setError(errorMsg);
          return;
        }
      }

      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      setError(`Failed to start listening: ${err}`);
    }
  };

  // Stop listening for speech
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Error stopping recognition:", err);
      }
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <View
        className="px-4 py-4 border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-bold text-foreground">{aiName}</Text>
            <Text className="text-sm text-muted capitalize">{aiCategory}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="p-2"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-lg font-bold text-foreground">✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View className="bg-error/10 px-4 py-3 m-4 rounded-lg border border-error/20">
          <Text className="text-sm text-error font-medium">{error}</Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        scrollEnabled={true}
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-4xl mb-4">🎤</Text>
            <Text className="text-lg font-semibold text-foreground mb-2">
              Start a Conversation
            </Text>
            <Text className="text-sm text-muted text-center px-4">
              Press the microphone button below and speak. {aiName} will respond with voice.
            </Text>
          </View>
        ) : (
          newestConversationFirst(messages, (msg) => msg.type).map((msg) => (
            <View
              key={msg.id}
              className={`mb-4 ${
                msg.type === "user" ? "items-end" : "items-start"
              }`}
            >
              <View
                className={`max-w-xs rounded-lg px-4 py-3 ${
                  msg.type === "user"
                    ? "bg-primary"
                    : "bg-surface border border-border"
                }`}
              >
                <Text
                  className={`text-base ${
                    msg.type === "user" ? "text-white" : "text-foreground"
                  }`}
                >
                  {msg.text}
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    msg.type === "user" ? "text-white/70" : "text-muted"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))
        )}

        {isProcessing && (
          <View className="flex-row items-center gap-2 mb-4">
            <ActivityIndicator color={colors.primary} size="small" />
            <Text className="text-sm text-muted">Processing...</Text>
          </View>
        )}

        {isSpeaking && (
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-lg">🔊</Text>
            <Text className="text-sm text-muted">Speaking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Controls */}
      <View
        className="px-4 py-4 border-t"
        style={{ borderTopColor: colors.border }}
      >
        {/* Transcript Display */}
        {transcript && (
          <View className="mb-3 p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xs text-muted mb-1">You said:</Text>
            <Text className="text-sm text-foreground">{transcript}</Text>
          </View>
        )}

        {/* Microphone Button */}
        <ChatSideComposer
          tools={
            <>
        <TouchableOpacity
          testID="ai-text-button"
          accessibilityLabel="Text"
          onPress={() => setTextFocusNonce((n) => n + 1)}
          disabled={isProcessing || isSpeaking}
          style={[
            chatRailButtonStyle,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="ai-talk-mic"
          accessibilityLabel="Talk"
          onPress={isListening ? stopListening : startListening}
          disabled={isProcessing || isSpeaking}
          style={[
            chatRailButtonStyle,
            {
              backgroundColor: isListening ? colors.error : colors.primary,
              borderColor: "transparent",
              opacity: isProcessing || isSpeaking ? 0.6 : 1,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>{isListening ? "Stop" : "Talk"}</Text>
        </TouchableOpacity>
            </>
          }
          send={
        <TouchableOpacity
          onPress={() => {
            const question = draft.trim();
            if (!question) return;
            setDraft("");
            void handleUserMessage(question);
          }}
          disabled={isProcessing || isSpeaking || !draft.trim()}
          style={{
            alignSelf: "stretch",
            width: "100%",
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor: colors.primary,
            opacity: isProcessing || isSpeaking || !draft.trim() ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Send</Text>
        </TouchableOpacity>
          }
        >
        <ChatComposerInput
          value={draft}
          onChangeText={setDraft}
          focusNonce={textFocusNonce}
          placeholder={`Ask ${aiName} in text…`}
          placeholderTextColor={colors.muted}
          editable={!isProcessing}
          maxLength={2000}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.foreground,
            backgroundColor: colors.background,
          }}
        />
        </ChatSideComposer>

        {/* Browser Compatibility Note */}
        <Text className="text-xs text-muted text-center mt-3">
          💡 Works best in Chrome, Edge, or Safari on desktop/mobile
        </Text>
      </View>
    </View>
  );
}
