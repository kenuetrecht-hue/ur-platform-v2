import { useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { UR_STUN_ICE_SERVERS } from "@/lib/webrtc-ice";

type Peer = { userId: string; name: string };

type Props = {
  feedId: string;
  myUserId: string;
  peers: Peer[];
};

function sdpPayload(description: RTCSessionDescriptionInit): string {
  return JSON.stringify({ type: description.type, sdp: description.sdp ?? "" });
}

export function LiveFeedInterview({ feedId, myUserId, peers }: Props) {
  const colors = useColors();
  const signal = trpc.liveFeed.signal.useMutation();
  const signals = trpc.liveFeed.signals.useQuery(
    { feedId },
    { refetchInterval: 2_000, enabled: Platform.OS === "web" && peers.length > 0 },
  );
  const signalRef = useRef(signal);
  signalRef.current = signal;
  const peerKey = peers
    .map((peer) => peer.userId)
    .sort()
    .join(",");
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const localStream = useRef<MediaStream | null>(null);
  const appliedIce = useRef(new Map<string, number>());

  useEffect(() => {
    if (Platform.OS !== "web" || peerKey.length === 0) return;
    let cancelled = false;
    const ownStream = localStream;
    const connections = pcs;

    const ensure = async (peerId: string) => {
      if (connections.current.has(peerId) || cancelled) return;
      const pc = new RTCPeerConnection({ iceServers: UR_STUN_ICE_SERVERS });
      connections.current.set(peerId, pc);
      if (!ownStream.current) {
        ownStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      }
      if (cancelled) return;
      ownStream.current.getTracks().forEach((track) => pc.addTrack(track, ownStream.current!));
      const local = videoRefs.current.get("local");
      if (local && ownStream.current) {
        local.srcObject = ownStream.current;
        local.muted = true;
        void local.play().catch(() => undefined);
      }
      pc.ontrack = (event) => {
        const el = videoRefs.current.get(peerId);
        const stream = event.streams[0];
        if (el && stream) {
          el.srcObject = stream;
          void el.play().catch(() => undefined);
        }
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        signalRef.current.mutate({
          feedId,
          peerUserId: peerId,
          kind: "ice",
          payload: JSON.stringify(event.candidate.toJSON()),
        });
      };
      if (myUserId < peerId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signalRef.current.mutate({
          feedId,
          peerUserId: peerId,
          kind: "offer",
          payload: sdpPayload(offer),
        });
      }
    };

    void Promise.all(peerKey.split(",").map((peerId) => ensure(peerId))).catch(() => undefined);

    return () => {
      cancelled = true;
      connections.current.forEach((pc) => pc.close());
      connections.current.clear();
      ownStream.current?.getTracks().forEach((track) => track.stop());
      ownStream.current = null;
    };
  }, [feedId, myUserId, peerKey]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const rows = signals.data ?? [];
    for (const row of rows) {
      const pc = pcs.current.get(row.peerUserId);
      if (!pc) continue;
      const apply = async () => {
        if (row.offer && myUserId > row.peerUserId && !pc.currentRemoteDescription) {
          const offer = JSON.parse(row.offer) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          signalRef.current.mutate({
            feedId,
            peerUserId: row.peerUserId,
            kind: "answer",
            payload: sdpPayload(answer),
          });
        }
        if (row.answer && myUserId < row.peerUserId && !pc.currentRemoteDescription) {
          const answer = JSON.parse(row.answer) as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(answer);
        }
        const seen = appliedIce.current.get(row.peerUserId) ?? 0;
        for (const item of row.ice.slice(seen)) {
          if (item.fromUserId === myUserId) continue;
          await pc.addIceCandidate(JSON.parse(item.candidate) as RTCIceCandidateInit);
        }
        appliedIce.current.set(row.peerUserId, row.ice.length);
      };
      void apply().catch(() => undefined);
    }
  }, [signals.data, feedId, myUserId]);

  if (Platform.OS !== "web") {
    return (
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        Open this co-host link in a web browser to turn on your camera and join the interview.
      </Text>
    );
  }

  return (
    <View style={styles.grid}>
      <View style={styles.tile}>
        {Platform.OS === "web" ? (
          // @ts-expect-error web video preview
          <video
            ref={(node: HTMLVideoElement | null) => {
              if (node) videoRefs.current.set("local", node);
            }}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", aspectRatio: "16 / 9", backgroundColor: "#111", borderRadius: 8 }}
          />
        ) : null}
        <Text style={[styles.name, { color: colors.foreground }]}>You</Text>
      </View>
      {peers.map((peer) => (
        <View key={peer.userId} style={styles.tile}>
          {Platform.OS === "web" ? (
            // @ts-expect-error web video preview
            <video
              ref={(node: HTMLVideoElement | null) => {
                if (node) videoRefs.current.set(peer.userId, node);
              }}
              autoPlay
              playsInline
              style={{ width: "100%", aspectRatio: "16 / 9", backgroundColor: "#111", borderRadius: 8 }}
            />
          ) : null}
          <Text style={[styles.name, { color: colors.foreground }]}>{peer.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: 160, gap: 4 },
  name: { fontSize: 12, fontWeight: "700" },
});
