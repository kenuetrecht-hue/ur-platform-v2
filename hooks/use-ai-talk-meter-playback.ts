import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { METER_HEARTBEAT_INTERVAL_MS } from "@/lib/ai-metering-policy";
import { isMeteringConnected, useNetworkConnectivity } from "@/hooks/use-network-connectivity";
import { stopExclusiveAudio } from "@/lib/exclusive-audio-player";

type PlayMeteredAudioParams = {
  meterSessionId: string;
  audioUrl: string;
  durationMs: number;
  onStatus?: (message: string) => void;
};

/**
 * Plays AI voice with disconnect-safe millisecond metering.
 * Billing pauses when offline; resumes at the same playback position when back.
 */
export function useAiTalkMeterPlayback() {
  const connectivity = useNetworkConnectivity();
  const utils = trpc.useUtils();
  const heartbeat = trpc.aiTalk.meterHeartbeat.useMutation();
  const pause = trpc.aiTalk.meterPause.useMutation();
  const resume = trpc.aiTalk.meterResume.useMutation();
  const finalize = trpc.aiTalk.meterFinalize.useMutation();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef<string | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasConnectedRef = useRef(true);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const syncMeter = useCallback(
    async (sessionId: string, audio: HTMLAudioElement) => {
      const connected = isMeteringConnected(connectivity);
      const positionMs = Math.floor(audio.currentTime * 1000);

      if (!connected) {
        if (wasConnectedRef.current) {
          await pause.mutateAsync({
            sessionId,
            playbackPositionMs: positionMs,
            reason: "disconnect",
          });
          audio.pause();
          wasConnectedRef.current = false;
        }
        return;
      }

      if (!wasConnectedRef.current) {
        await resume.mutateAsync({ sessionId, playbackPositionMs: positionMs });
        wasConnectedRef.current = true;
        void audio.play().catch(() => undefined);
      }

      const result = await heartbeat.mutateAsync({
        sessionId,
        playbackPositionMs: positionMs,
        clientOnline: true,
      });

      if (result.projectedRemainingMs <= 0) {
        audio.pause();
        throw new Error("Talk time exhausted.");
      }
    },
    [connectivity, heartbeat, pause, resume],
  );

  const playMeteredAudio = useCallback(
    async ({ meterSessionId, audioUrl, durationMs, onStatus }: PlayMeteredAudioParams) => {
      if (typeof window === "undefined") {
        onStatus?.("Metered playback requires web audio.");
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      stopExclusiveAudio();
      stopHeartbeat();

      sessionRef.current = meterSessionId;
      wasConnectedRef.current = isMeteringConnected(connectivity);

      const audio = new window.Audio(audioUrl);
      audioRef.current = audio;

      const finalizeSession = async () => {
        stopHeartbeat();
        const positionMs = Math.floor((audioRef.current?.currentTime ?? 0) * 1000);
        if (sessionRef.current) {
          await finalize.mutateAsync({
            sessionId: sessionRef.current,
            playbackPositionMs: positionMs,
          });
          void utils.aiTalk.getStatus.invalidate();
          sessionRef.current = null;
        }
      };

      audio.addEventListener("ended", () => {
        void finalizeSession().then(() => {
          onStatus?.("Playback complete — talk time updated.");
        });
      });

      audio.addEventListener("pause", () => {
        if (sessionRef.current && !audio.ended) {
          void pause.mutateAsync({
            sessionId: sessionRef.current,
            playbackPositionMs: Math.floor(audio.currentTime * 1000),
            reason: "user",
          });
        }
      });

      await audio.play();
      onStatus?.("Playing — billed only while connected.");

      stopHeartbeat();
      heartbeatTimer.current = setInterval(() => {
        if (!sessionRef.current || !audioRef.current) return;
        void syncMeter(sessionRef.current, audioRef.current).catch((error) => {
          onStatus?.(error instanceof Error ? error.message : "Meter sync failed");
        });
      }, METER_HEARTBEAT_INTERVAL_MS);

      void syncMeter(meterSessionId, audio);
    },
    [connectivity, finalize, pause, stopHeartbeat, syncMeter, utils.aiTalk.getStatus],
  );

  useEffect(() => {
    if (!sessionRef.current || !audioRef.current) return;
    void syncMeter(sessionRef.current, audioRef.current).catch(() => undefined);
  }, [connectivity.isOnline, connectivity.isApiReachable, syncMeter]);

  useEffect(() => () => stopHeartbeat(), [stopHeartbeat]);

  const stopPlayback = useCallback(() => {
    stopHeartbeat();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    stopExclusiveAudio();
  }, [stopHeartbeat]);

  return {
    playMeteredAudio,
    stopPlayback,
    connectivity,
  };
}
