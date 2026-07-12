/**
 * Voice Conversation Player Component
 * Handles audio playback, visualization, and real-time waveform display
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import * as Audio from "expo-audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

interface VoiceConversationPlayerProps {
  audioUrl: string;
  aiAgentName: string;
  aiAgentVoiceId: string;
  onPlaybackComplete?: () => void;
  onError?: (error: Error) => void;
}

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioLevel: number; // 0-1
}

/**
 * Audio Visualizer Component
 * Displays animated bars representing audio levels
 */
function AudioVisualizer({ isPlaying, audioLevel }: AudioVisualizerProps) {
  const bars = Array(12).fill(0);

  return (
    <View className="flex-row items-center justify-center gap-1 h-16">
      {bars.map((_, index) => {
        const height = isPlaying
          ? 20 + Math.sin((index + audioLevel) * 0.5) * 20
          : 8;

        return (
          <Animated.View
            key={index}
            style={{
              height: `${height}%`,
              width: 4,
              backgroundColor: "#6366f1",
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Waveform Display Component
 * Shows real-time waveform of audio being played
 */
function WaveformDisplay({
  isPlaying,
  duration,
  currentTime,
}: {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
}) {
  const waveformBars = Array(60).fill(0);
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View className="w-full h-12 bg-slate-900 rounded-lg p-2 flex-row items-center gap-0.5">
      {waveformBars.map((_, index) => {
        const isPlayed = index / waveformBars.length < progress;
        const height = 4 + Math.random() * 20;

        return (
          <View
            key={index}
            style={{
              height: `${height}%`,
              width: 2,
              backgroundColor: isPlayed ? "#10b981" : "#64748b",
              borderRadius: 1,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Main Voice Conversation Player Component
 */
export function VoiceConversationPlayer({
  audioUrl,
  aiAgentName,
  aiAgentVoiceId,
  onPlaybackComplete,
  onError,
}: VoiceConversationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioPlayerRef = useRef<any>(null);
  const audioLevelAnimated = useSharedValue(0);

  // Initialize audio player
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentMode: true,
          staysActiveInBackground: true,
        } as any);
      } catch (error) {
        console.error("Failed to set audio mode:", error);
      }
    };

    initializeAudio();

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.unloadAsync();
      }
    };
  }, []);

  // Load audio when URL changes
  useEffect(() => {
    const loadAudio = async () => {
      try {
        setIsLoading(true);

        if (audioPlayerRef.current) {
          await audioPlayerRef.current.unloadAsync();
        }

        const { sound } = await (Audio as any).Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false }
        );

        audioPlayerRef.current = sound;

        // Get audio duration
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
        }

        // Set up playback status update listener
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded) {
            setCurrentTime(status.positionMillis || 0);

            // Simulate audio level for visualization
            if (status.isPlaying) {
              setAudioLevel(Math.random() * 0.8 + 0.2);
            }

            if (status.didJustFinish) {
              setIsPlaying(false);
              onPlaybackComplete?.();
            }
          }
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load audio:", error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
        setIsLoading(false);
      }
    };

    if (audioUrl) {
      loadAudio();
    }
  }, [audioUrl, onPlaybackComplete, onError]);

  // Handle play/pause
  const handlePlayPause = async () => {
    try {
      if (!audioPlayerRef.current) return;

      if (isPlaying) {
        await audioPlayerRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await audioPlayerRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Playback error:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Handle seek
  const handleSeek = async (position: number) => {
    try {
      if (!audioPlayerRef.current) return;
      await audioPlayerRef.current.setPositionAsync(position);
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  // Format time display
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Animated style for audio level
  const audioLevelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(audioLevel, { duration: 100 }),
  }));

  return (
    <View className="w-full bg-gradient-to-b from-indigo-900 to-slate-900 rounded-2xl p-6 gap-4">
      {/* Header */}
      <View className="gap-2">
        <Text className="text-lg font-semibold text-white">{aiAgentName}</Text>
        <Text className="text-sm text-indigo-200">
          Speaking with {aiAgentVoiceId}
        </Text>
      </View>

      {/* Audio Visualizer */}
      <AudioVisualizer isPlaying={isPlaying} audioLevel={audioLevel} />

      {/* Waveform Display */}
      <WaveformDisplay
        isPlaying={isPlaying}
        duration={duration}
        currentTime={currentTime}
      />

      {/* Playback Controls */}
      <View className="flex-row items-center justify-between gap-4">
        {/* Play/Pause Button */}
        <Pressable
          onPress={handlePlayPause}
          disabled={isLoading}
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
          className="bg-indigo-500 rounded-full p-4 active:opacity-80"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-2xl">
              {isPlaying ? "⏸" : "▶"}
            </Text>
          )}
        </Pressable>

        {/* Time Display */}
        <View className="flex-1 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-xs text-indigo-200">
              {formatTime(currentTime)}
            </Text>
            <Text className="text-xs text-indigo-200">
              {formatTime(duration)}
            </Text>
          </View>

          {/* Progress Bar */}
          <Pressable
            onPress={(e) => {
              const position = duration > 0 ? (e.nativeEvent.locationX / 100) * duration : 0;
              handleSeek(position);
            }}
            className="h-1 bg-slate-700 rounded-full overflow-hidden"
          >
            <View
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
              className="h-full bg-indigo-400"
            />
          </Pressable>
        </View>

        {/* Volume Control */}
        <Pressable className="bg-slate-700 rounded-full p-3 active:opacity-70">
          <Text className="text-lg">🔊</Text>
        </Pressable>
      </View>

      {/* Status Message */}
      {isPlaying && (
        <Animated.View style={audioLevelStyle}>
          <Text className="text-xs text-center text-indigo-300">
            AI is speaking...
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Voice Input Recorder Component
 * Captures user voice input
 */
export function VoiceInputRecorder({
  onRecordingComplete,
  onError,
}: {
  onRecordingComplete?: (audioUri: string) => void;
  onError?: (error: Error) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef<any>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize recording
  useEffect(() => {
    const initializeRecording = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch (error) {
        console.error("Failed to initialize recording:", error);
      }
    };

    initializeRecording();

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Handle start recording
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);

      const recording = new (Audio as any).Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      recordingRef.current = recording;

      // Update recording time
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      setIsRecording(false);
    }
  };

  // Handle stop recording
  const handleStopRecording = async () => {
    try {
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        onRecordingComplete?.(uri);
      }

      recordingRef.current = null;
      setRecordingTime(0);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return (
    <View className="w-full bg-gradient-to-b from-red-900 to-slate-900 rounded-2xl p-6 gap-4">
      <Text className="text-lg font-semibold text-white text-center">
        {isRecording ? "Recording..." : "Ready to Record"}
      </Text>

      {isRecording && (
        <Text className="text-sm text-red-200 text-center">
          {Math.floor(recordingTime / 60)}:{(recordingTime % 60)
            .toString()
            .padStart(2, "0")}
        </Text>
      )}

      <Pressable
        onPress={isRecording ? handleStopRecording : handleStartRecording}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
        className={`rounded-full p-4 active:opacity-80 ${
          isRecording ? "bg-red-500" : "bg-indigo-500"
        }`}
      >
        <Text className="text-2xl text-center">
          {isRecording ? "⏹" : "🎤"}
        </Text>
      </Pressable>

      <Text className="text-xs text-center text-slate-400">
        {isRecording ? "Tap to stop recording" : "Tap to start recording"}
      </Text>
    </View>
  );
}

export default VoiceConversationPlayer;
