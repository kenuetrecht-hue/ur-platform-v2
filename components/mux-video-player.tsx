import { StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { muxHlsUrl } from "@/lib/mux-video-engine";

type Props = {
  playbackId: string;
  token?: string;
};

export function MuxVideoPlayer({ playbackId, token }: Props) {
  const player = useVideoPlayer(muxHlsUrl(playbackId, token), (instance) => {
    instance.loop = false;
  });

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
