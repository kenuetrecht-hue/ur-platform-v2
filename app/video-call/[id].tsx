import { ScrollView, Text, View, Pressable, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";

export default function VideoCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [callActive, setCallActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingConsent, setRecordingConsent] = useState(false);

  useEffect(() => {
    if (callActive) {
      const interval = setInterval(() => setDuration((d) => d + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [callActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallActive(false);
    router.back();
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Video Call Header */}
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-foreground">Video Call</Text>
            {callActive && (
              <Text className="text-lg font-semibold text-primary">{formatDuration(duration)}</Text>
            )}
          </View>

          {/* Video Preview Area */}
          <View
            className="w-full aspect-video bg-surface rounded-2xl border-2 border-border items-center justify-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Text className="text-muted text-center">
              {callActive ? "📹 Video Stream Active" : "📹 Ready to Start Call"}
            </Text>
          </View>

          {/* Recording Consent */}
          <View className="bg-yellow-100 rounded-lg p-4 border border-yellow-400">
            <Text className="text-sm text-gray-900 font-semibold mb-3">Recording Consent</Text>
            <Pressable
              onPress={() => setRecordingConsent(!recordingConsent)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                },
              ]}
            >
              <View
                className={`w-6 h-6 rounded border-2 items-center justify-center ${
                  recordingConsent ? "bg-primary border-primary" : "border-gray-400"
                }`}
              >
                {recordingConsent && <Text className="text-white font-bold">✓</Text>}
              </View>
              <Text className="text-sm text-gray-900 flex-1">
                I consent to this call being recorded
              </Text>
            </Pressable>
          </View>

          {/* Call Controls */}
          <View className="flex-row gap-4 justify-center">
            <Pressable
              onPress={() => setCallActive(!callActive)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 24,
                  backgroundColor: callActive ? colors.error : colors.primary,
                },
              ]}
            >
              <Text className="text-white font-semibold text-center">
                {callActive ? "End Call" : "Start Call"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleEndCall}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 24,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text className="text-foreground font-semibold text-center">Cancel</Text>
            </Pressable>
          </View>

          {/* Call Info */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-2">
            <Text className="text-sm font-semibold text-foreground">Call Information</Text>
            <Text className="text-xs text-muted">Price: $5.99/minute</Text>
            <Text className="text-xs text-muted">Duration: {formatDuration(duration)}</Text>
            <Text className="text-xs text-muted">
              Estimated Cost: ${(duration / 60 * 5.99).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
