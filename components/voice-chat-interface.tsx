import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { generateAIVoiceResponse } from "@/lib/ai-voice-responses";
import { speakText } from "@/lib/azure-tts-service";
import { androidMicrophoneHandler } from "@/lib/android-microphone-handler";

interface VoiceChatMessage {
  id: string;
  type: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface VoiceChatInterfaceProps {
  aiName: string;
  aiCategory: string;
  onClose: () => void;
}

export function VoiceChatInterface({
  aiName,
  aiCategory,
  onClose,
}: VoiceChatInterfaceProps) {
  const colors = useColors();
  const [messages, setMessages] = useState<VoiceChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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
          handleUserMessage(finalTranscript.trim());
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
      const aiResponse = generateAIVoiceResponse({
        aiName,
        aiCategory,
        userMessage: userText,
      });

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
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
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
          messages.map((msg) => (
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
        <TouchableOpacity
          onPress={isListening ? stopListening : startListening}
          disabled={isProcessing || isSpeaking}
          className="p-4 rounded-full items-center justify-center"
          style={{
            backgroundColor: isListening ? colors.error : colors.primary,
            opacity: isProcessing || isSpeaking ? 0.6 : 1,
          }}
        >
          <Text className="text-3xl">
            {isListening ? "🛑" : "🎤"}
          </Text>
          <Text className="text-white font-semibold mt-2">
            {isListening ? "Stop Listening" : "Start Listening"}
          </Text>
          <Text className="text-white/70 text-xs mt-1">
            {isListening ? "Tap to stop" : "Tap to speak"}
          </Text>
        </TouchableOpacity>

        {/* Browser Compatibility Note */}
        <Text className="text-xs text-muted text-center mt-3">
          💡 Works best in Chrome, Edge, or Safari on desktop/mobile
        </Text>
      </View>
    </View>
  );
}
