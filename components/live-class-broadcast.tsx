import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { MuxVideoPlayer } from "@/components/mux-video-player";

type Props = {
  sessionId: string;
  isHost: boolean;
};

export function LiveClassBroadcast({ sessionId, isHost }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const watch = trpc.muxVideo.watchClassLive.useQuery(
    { sessionId },
    { refetchInterval: 8_000, enabled: Boolean(sessionId) },
  );
  const start = trpc.muxVideo.startClassLive.useMutation({
    onSuccess: () => {
      void utils.muxVideo.watchClassLive.invalidate({ sessionId });
    },
  });

  const playback = watch.data?.playback;
  const hostSetup = start.data;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Live picture</Text>
      {watch.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : playback ? (
        <MuxVideoPlayer playbackId={playback.playbackId} token={playback.token} />
      ) : (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          {watch.data?.locked
            ? "The live picture is locked until playback signing is turned on."
            : "The live picture has not started. Stay on this page. A ticket is what lets you watch."}
        </Text>
      )}
      {isHost ? (
        <View style={styles.host}>
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>
            This class stays on UR. Set the encoder to 1080p. The picture then adjusts for each
            viewer's connection, and the delay stays short. Paste the server and stream key into OBS,
            Streamlabs, or a phone encoder, then press Start Streaming there. People with a ticket
            watch on this page. They are not sent to YouTube. When you stop, the recording is kept
            for the class replay.
          </Text>
          <Pressable
            onPress={() => start.mutate({ sessionId })}
            disabled={start.isPending}
            style={[styles.btn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            testID="start-class-live"
          >
            <Text style={styles.btnText}>
              {start.isPending ? "Starting…" : hostSetup ? "Show the stream key again" : "Start the live broadcast"}
            </Text>
          </Pressable>
          {hostSetup ? (
            <View style={styles.keyBox}>
              <Text style={[styles.keyLabel, { color: colors.muted }]}>Server</Text>
              <Text selectable style={{ color: colors.foreground, fontSize: 12 }}>
                {hostSetup.rtmpUrl}
              </Text>
              <Text style={[styles.keyLabel, { color: colors.muted }]}>Stream key — only you should see this</Text>
              <Text selectable style={{ color: colors.foreground, fontSize: 12 }}>
                {hostSetup.streamKey}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                Picture status: {hostSetup.status === "active" ? "live" : "waiting for your encoder"}
              </Text>
            </View>
          ) : null}
          {start.error ? (
            <Text style={styles.error}>{start.error.message}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  title: { fontWeight: "800", fontSize: 14 },
  host: { gap: 8 },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  keyBox: { gap: 4 },
  keyLabel: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  error: { color: "#e74c3c", fontSize: 12 },
});
