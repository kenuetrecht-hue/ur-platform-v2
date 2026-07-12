/**
 * Adaptive HLS Media Player Component
 * 
 * Features:
 * - Adaptive bitrate streaming (auto-switches based on network speed)
 * - HLS.js for cross-browser compatibility
 * - Playback controls and progress tracking
 * - Responsive design for mobile and web
 * - Error handling and retry logic
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface AdaptiveMediaPlayerProps {
  mediaUrl: string;
  mediaType: "video" | "audio";
  title?: string;
  autoPlay?: boolean;
  onError?: (error: Error) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export function AdaptiveMediaPlayer({
  mediaUrl,
  mediaType,
  title,
  autoPlay = false,
  onError,
  onPlaybackStateChange,
}: AdaptiveMediaPlayerProps) {
  const colors = useColors();
  const playerRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [quality, setQuality] = useState<string>("auto");
  const [error, setError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);

  // Initialize HLS.js for adaptive streaming
  useEffect(() => {
    if (mediaType !== "video" || !mediaUrl) return;

    const initializeHLS = async () => {
      try {
        // Dynamically import HLS.js
        const HLS = (await import("hls.js")).default;

        if (!HLS.isSupported()) {
          console.warn("HLS.js is not supported in this browser");
          setError("Adaptive streaming not supported");
          return;
        }

        const video = playerRef.current as HTMLVideoElement;
        if (!video) return;

        // Initialize HLS instance
        const hls = new HLS({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        // Listen for manifest parsed event
        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          console.log("[HLS] Manifest parsed, available levels:", hls.levels);
          setQuality("auto");
          setIsLoading(false);

          if (autoPlay) {
            video.play().catch((err) => {
              console.error("[HLS] Autoplay failed:", err);
            });
          }
        });

        // Listen for level switching (quality changes)
        hls.on(HLS.Events.LEVEL_SWITCHING, (data: any) => {
          console.log(`[HLS] Switching to level ${data.level}`);
          if (hls.levels[data.level]) {
            const level = hls.levels[data.level];
            setQuality(`${level.height}p`);
          }
        });

        // Listen for errors
        hls.on(HLS.Events.ERROR, (event: any, data: any) => {
          console.error("[HLS] Error:", data);

          if (data.fatal) {
            switch (data.type) {
              case HLS.ErrorTypes.NETWORK_ERROR:
                console.error("[HLS] Network error, retrying...");
                hls.startLoad();
                break;
              case HLS.ErrorTypes.MEDIA_ERROR:
                console.error("[HLS] Media error, recovering...");
                hls.recoverMediaError();
                break;
              default:
                setError("Playback error. Please try again.");
                if (onError) {
                  onError(new Error(`HLS Error: ${data.type}`));
                }
                break;
            }
          }
        });

        // Attach video element to HLS instance
        hls.attachMedia(video);
        hls.loadSource(mediaUrl);

        // Cleanup on unmount
        return () => {
          hls.destroy();
        };
      } catch (err) {
        console.error("[HLS] Initialization failed:", err);
        setError("Failed to initialize media player");
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initializeHLS();
  }, [mediaUrl, mediaType, autoPlay, onError]);

  // Handle native audio/video playback for non-HLS streams
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlaybackStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlaybackStateChange?.(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(player.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(player.duration);
      setIsLoading(false);
    };

    const handleProgress = () => {
      if (player.buffered.length > 0) {
        const bufferedEnd = player.buffered.end(player.buffered.length - 1);
        setBuffered((bufferedEnd / player.duration) * 100);
      }
    };

    const handleError = () => {
      setError("Failed to load media");
      if (onError) {
        onError(new Error("Media playback error"));
      }
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("timeupdate", handleTimeUpdate);
    player.addEventListener("loadedmetadata", handleLoadedMetadata);
    player.addEventListener("progress", handleProgress);
    player.addEventListener("error", handleError);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.removeEventListener("loadedmetadata", handleLoadedMetadata);
      player.removeEventListener("progress", handleProgress);
      player.removeEventListener("error", handleError);
    };
  }, [onPlaybackStateChange, onError]);

  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play().catch((err) => {
        console.error("Playback failed:", err);
      });
    }
  };

  const handleSeek = (newTime: number) => {
    const player = playerRef.current;
    if (player) {
      player.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <View
        style={{
          backgroundColor: colors.error + "20",
          borderRadius: 8,
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={{ color: colors.error, fontSize: 14, fontWeight: "600" }}>
          ⚠️ Playback Error
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 12 }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        overflow: "hidden",
        gap: 12,
      }}
    >
      {/* Media Player Container */}
      <View
        style={{
          backgroundColor: "#000",
          aspectRatio: mediaType === "video" ? 16 / 9 : undefined,
          height: mediaType === "audio" ? 60 : undefined,
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {mediaType === "video" ? (
          <video
            ref={playerRef as any}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#000",
            }}
            controls={false}
          />
        ) : (
          <audio
            ref={playerRef as any}
            style={{
              width: "100%",
              height: "100%",
            }}
            controls={false}
          />
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View
            style={{
              position: "absolute",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
              width: "100%",
              height: "100%",
            }}
          >
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {/* Play Button Overlay */}
        {!isPlaying && !isLoading && mediaType === "video" && (
          <Pressable
            onPress={togglePlayPause}
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.primary,
              justifyContent: "center",
              alignItems: "center",
              opacity: 0.8,
            }}
          >
            <Text style={{ fontSize: 24 }}>▶️</Text>
          </Pressable>
        )}
      </View>

      {/* Title */}
      {title && (
        <Text
          style={{
            color: colors.foreground,
            fontSize: 14,
            fontWeight: "600",
            paddingHorizontal: 12,
            paddingTop: 4,
          }}
        >
          {title}
        </Text>
      )}

      {/* Controls */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
        {/* Progress Bar */}
        <View style={{ gap: 4 }}>
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                backgroundColor: colors.primary,
                width: `${(currentTime / duration) * 100}%`,
              }}
            />
          </View>

          {/* Buffered Indicator */}
          <View
            style={{
              height: 2,
              backgroundColor: colors.border,
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                backgroundColor: colors.muted,
                width: `${buffered}%`,
              }}
            />
          </View>
        </View>

        {/* Time Display */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            Quality: {quality}
          </Text>
        </View>

        {/* Playback Controls */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Pressable
            onPress={togglePlayPause}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: colors.primary,
              paddingVertical: 10,
              borderRadius: 6,
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSeek(Math.max(0, currentTime - 10))}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16 }}>⏪ -10s</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSeek(Math.min(duration, currentTime + 10))}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 16 }}>⏩ +10s</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
