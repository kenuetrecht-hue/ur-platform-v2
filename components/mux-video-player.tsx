import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { muxHlsUrl } from "@/lib/mux-video-engine";
import { useFairShowWatch } from "@/hooks/use-fair-show-watch";
import { FAIR_SHOW_RULES, type FairShowContentKind } from "@/lib/fair-show";

type Props = {
  playbackId: string;
  token?: string;
  watch?: { contentId: string; kind: FairShowContentKind; durationSeconds: number };
};

export function MuxVideoPlayer({ playbackId, token, watch }: Props) {
  const player = useVideoPlayer(muxHlsUrl(playbackId, token), (instance) => {
    instance.loop = false;
  });
  const { pulse } = useFairShowWatch(watch ?? null);

  useEffect(() => {
    if (!watch) return;
    const timer = setInterval(() => {
      if (!player.playing) return;
      const seconds = Math.round(player.currentTime ?? 0);
      const duration = watch.durationSeconds;
      pulse(seconds, duration > 0 && seconds >= duration - 1);
    }, FAIR_SHOW_RULES.heartbeatSeconds * 1000);
    return () => clearInterval(timer);
  }, [watch, player, pulse]);

  return (
    <View style={styles.wrap}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000", borderRadius: 12, overflow: "hidden" },
  video: { width: "100%", height: "100%" },
});
