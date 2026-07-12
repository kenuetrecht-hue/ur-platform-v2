import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator , Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SYSTEM_CREATOR_REGISTRY } from "@/app/_layout";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

export default function RealEstateAcquisitions() {
  const colors = useColors();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voiceResponse, setVoiceResponse] = useState<string>("");
  const [error, setError] = useState<string>("");
  const recordingRef = useRef<any>(null);
  const audioPlayerRef = useRef<any>(null);

  // Import the Acquisitions Director from the system registry
  const acquisitionsDirector = SYSTEM_CREATOR_REGISTRY.REAL_ESTATE_MASTER;

  // Initialize tRPC mutations and queries
  const createSessionMutation = trpc.voiceProperty.createVoiceSession.useMutation();
  const addAudioChunkMutation = trpc.voiceProperty.addAudioChunk.useMutation();
  const endSessionMutation = trpc.voiceProperty.endVoiceSession.useMutation();
  const synthesizeVoiceMutation = trpc.voiceProperty.synthesizeVoice.useMutation();

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      if (Platform.OS !== "web") {
        try {
          const { setAudioModeAsync } = await import("expo-audio");
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
          });
        } catch (err) {
          console.error("Audio init error:", err);
        }
      }
    };
    initAudio();

    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.release();
      }
    };
  }, []);

  /**
   * Start recording voice input
   */
  const startRecording = async () => {
    try {
      setError("");
      setIsRecording(true);

      // Create voice session
      const session = await createSessionMutation.mutateAsync({
        userId: "user_123", // TODO: Get from auth context
        personaId: "REAL_ESTATE_MASTER",
      });

      setSessionId(session.sessionId || null);

      // Start recording
      if (Platform.OS === "web") {
        setError("Voice recording not supported on web. Use text chat instead.");
        setIsRecording(false);
        return;
      }

      // Use expo-audio recording API with proper typing
      const audioModule = await import("expo-audio");
      const recording = new (audioModule as any).Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          audioQuality: 4,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });
      await recording.startAsync();
      recordingRef.current = recording;

      // Haptic feedback
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Haptics not available on web
      }
    } catch (err) {
      console.error("Recording start error:", err);
      setError("Failed to start recording");
      setIsRecording(false);
    }
  };

  /**
   * Stop recording and process voice
   */
  const stopRecording = async () => {
    try {
      if (!recordingRef.current || !sessionId) {
        setIsRecording(false);
        return;
      }

      setIsProcessing(true);
      await recordingRef.current.stopAndUnloadAsync();

      // Get audio URI
      const uri = recordingRef.current.getURI();
      if (!uri) {
        throw new Error("No recording URI");
      }

      // Read audio file and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(",")[1];

        try {
          // Send audio chunk to backend
          await addAudioChunkMutation.mutateAsync({
            sessionId,
            audioChunk: base64Audio,
          });

          // End session and get AI response
          const result = await endSessionMutation.mutateAsync({
            sessionId,
          });

          // Mock AI response for demo
          const mockResponse =
            "Based on the property analysis, the ARV estimate is $450,000 with a MAO of $315,000. This represents a strong acquisition opportunity with 30% profit margin potential.";
          setVoiceResponse(mockResponse);

          // Synthesize voice response
          const audioResponse = await synthesizeVoiceMutation.mutateAsync({
            text: mockResponse,
            personaId: "REAL_ESTATE_MASTER",
          });

          // Play audio response
          if (audioResponse.success && audioResponse.audioUrl) {
            playAudioResponse(audioResponse.audioUrl);
          }
        } catch (err) {
          console.error("Processing error:", err);
          setError("Failed to process voice");
        }
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Recording stop error:", err);
      setError("Failed to stop recording");
    } finally {
      setIsRecording(false);
      setIsProcessing(false);
      recordingRef.current = null;
    }
  };

  /**
   * Play audio response from AI
   */
  const playAudioResponse = async (audioUrl: string) => {
    try {
      if (audioPlayerRef.current) {
        await audioPlayerRef.current.release();
      }

      if (Platform.OS === "web") {
        // Use HTML audio on web
        const audio = new (window as any).Audio();
        audio.src = audioUrl;
        await audio.play();
        return;
      }

      // For native audio playback
      try {
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const audio = new (window as any).Audio();
        audio.src = blobUrl;
        await audio.play();
        audioPlayerRef.current = audio;
      } catch (err) {
        console.error("Audio playback error:", err);
      }

      // Haptic feedback
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch (e) {
        // Haptics not available on web
      }
    } catch (err) {
      console.error("Playback error:", err);
      setError("Failed to play response");
    }
  };

  const handleMicrophonePress = () => {
    if (!isRecording && !isProcessing) {
      startRecording();
    }
  };

  const handleMicrophoneRelease = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  return (
    <ScreenContainer className="bg-black">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-white">
              💰 UR Media Investment Analytics Hub
            </Text>
            <Text className="text-sm text-gray-400">$ARV / $MAO Engine</Text>
          </View>

          {/* AI Creator Profile Card */}
          <View
            className="rounded-2xl p-6 border border-indigo-600/30 gap-4"
            style={{ backgroundColor: "#0f172a" }}
          >
            {/* Avatar Container */}
            <View className="items-center gap-3">
              <View
                className="w-24 h-24 rounded-full border-2 border-indigo-600 flex items-center justify-center"
                style={{ backgroundColor: "#1e293b" }}
              >
                <Text className="text-5xl">👩‍💼</Text>
              </View>

              <View className="items-center gap-1">
                <Text className="text-xl font-bold text-white">
                  {acquisitionsDirector.displayName}
                </Text>
                <Text className="text-xs text-indigo-400 font-semibold">
                  Real Estate Acquisitions Specialist
                </Text>
              </View>
            </View>

            {/* Voice Model Status */}
            <View
              className="rounded-lg p-3 border border-indigo-600/50 gap-2"
              style={{ backgroundColor: "#1e1b4b" }}
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">🎙️</Text>
                <Text className="text-xs text-gray-300">Voice DNA Active</Text>
              </View>
              <Text className="text-sm font-mono text-indigo-300">
                {acquisitionsDirector.elevenLabsVoiceId}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Tone: {acquisitionsDirector.vocalStyleTone}
              </Text>
            </View>

            {/* Vocal Style Description */}
            <View className="gap-2 pt-2 border-t border-indigo-600/30">
              <Text className="text-xs text-gray-400 leading-relaxed">
                🎯 Specialized in property valuation, ARV analysis, and
                acquisition strategy. Provides real-time market insights and
                deal assessment.
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="grid grid-cols-2 gap-3">
            <View
              className="rounded-lg p-4 border border-gray-700"
              style={{ backgroundColor: "#1e293b" }}
            >
              <Text className="text-xs text-gray-400 mb-2">Active Deals</Text>
              <Text className="text-2xl font-bold text-indigo-400">12</Text>
            </View>

            <View
              className="rounded-lg p-4 border border-gray-700"
              style={{ backgroundColor: "#1e293b" }}
            >
              <Text className="text-xs text-gray-400 mb-2">Portfolio Value</Text>
              <Text className="text-2xl font-bold text-green-400">$2.4M</Text>
            </View>
          </View>

          {/* Voice Response Display */}
          {voiceResponse && (
            <View
              className="rounded-lg p-4 border border-green-600/30 gap-2"
              style={{ backgroundColor: "#0f2818" }}
            >
              <Text className="text-xs text-green-400 font-semibold">
                ✓ AI Response
              </Text>
              <Text className="text-sm text-gray-200 leading-relaxed">
                {voiceResponse}
              </Text>
            </View>
          )}

          {/* Error Display */}
          {error && (
            <View
              className="rounded-lg p-4 border border-red-600/30 gap-2"
              style={{ backgroundColor: "#2a0f0f" }}
            >
              <Text className="text-xs text-red-400 font-semibold">
                ⚠️ Error
              </Text>
              <Text className="text-sm text-gray-200">{error}</Text>
            </View>
          )}

          {/* Main CTA: Voice Interaction Button */}
          <View className="gap-4 pt-4">
            <Pressable
              onPressIn={handleMicrophonePress}
              onPressOut={handleMicrophoneRelease}
              disabled={isProcessing}
              style={({ pressed }) => ({
                backgroundColor:
                  isRecording || isProcessing ? "#4f46e5" : "#6366f1",
                borderRadius: 9999,
                paddingVertical: 24,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#4f46e5",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isRecording || isProcessing ? 0.8 : 0.4,
                shadowRadius: isRecording || isProcessing ? 20 : 10,
                elevation: isRecording || isProcessing ? 12 : 6,
                transform: [{ scale: pressed && !isProcessing ? 0.95 : 1 }],
                opacity: isProcessing ? 0.7 : 1,
              })}
            >
              <View className="items-center gap-2">
                {isProcessing ? (
                  <ActivityIndicator color="white" size="large" />
                ) : (
                  <>
                    <Text style={{ fontSize: 32 }}>🎙️</Text>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "700",
                        fontSize: 16,
                        textAlign: "center",
                      }}
                    >
                      {isRecording
                        ? "Release to Submit"
                        : "Hold to Speak to\nAcquisitions Partner"}
                    </Text>
                    {isRecording && (
                      <Text
                        style={{
                          color: "#c7d2fe",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        🔴 Recording...
                      </Text>
                    )}
                  </>
                )}
              </View>
            </Pressable>

            <Text
              style={{
                color: colors.muted,
                fontSize: 12,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {isProcessing
                ? "Processing your query..."
                : "Press and hold to activate voice mode. Release to submit query."}
            </Text>
          </View>

          {/* Alternative Actions */}
          <View className="gap-2 flex-row">
            <Pressable
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.surface,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
                alignItems: "center",
              })}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                📊 View Analytics
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.surface,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
                alignItems: "center",
              })}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                💬 Text Chat
              </Text>
            </Pressable>
          </View>

          {/* Footer Note */}
          <View
            className="rounded-lg p-4 border border-gray-700"
            style={{ backgroundColor: "#0f172a" }}
          >
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
              ⚠️{" "}
              <Text style={{ fontWeight: "600" }}>Disclosure:</Text> You are
              interacting with a synthetic AI persona possessing a custom visual
              avatar and cloned vocal model. This interaction may contain
              affiliate links yielding commissions to UR LLC.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
