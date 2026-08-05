import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type Props = {
  roomId: string;
  friendUserId: string;
  isCaller: boolean;
  onClose: () => void;
};

/** Friend video chat — WebRTC on web; status UI on native. */
export function FriendVideoCallPanel({ roomId, isCaller, onClose }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState<string | null>(null);

  const join = trpc.social.joinVideoCall.useMutation();
  const end = trpc.social.endVideoCall.useMutation();
  const room = trpc.social.getVideoCall.useQuery(
    { roomId },
    { refetchInterval: 2000, enabled: Boolean(roomId) },
  );
  const signalOffer = trpc.social.signalVideoOffer.useMutation();
  const signalAnswer = trpc.social.signalVideoAnswer.useMutation();
  const signalIce = trpc.social.signalIceCandidate.useMutation();

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setStatus("Video chat active (use web app for full camera video)");
      join.mutate({ roomId });
      return;
    }

    let cancelled = false;

    async function startWebRtc() {
      try {
        setStatus("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) return;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play();
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current && ev.streams[0]) {
            remoteVideoRef.current.srcObject = ev.streams[0];
            void remoteVideoRef.current.play();
          }
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            signalIce.mutate({
              roomId,
              candidate: JSON.stringify(ev.candidate),
            });
          }
        };

        await join.mutateAsync({ roomId });

        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await signalOffer.mutateAsync({ roomId, sdp: JSON.stringify(offer) });
          setStatus("Calling friend…");
        } else {
          setStatus("Waiting for offer…");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start video");
      }
    }

    void startWebRtc();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [roomId, isCaller]);

  useEffect(() => {
    if (Platform.OS !== "web" || !room.data?.offerSdp || isCaller || !pcRef.current) return;
    const pc = pcRef.current;
    if (pc.currentRemoteDescription) return;
    void (async () => {
      await pc.setRemoteDescription(JSON.parse(room.data!.offerSdp!) as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signalAnswer.mutateAsync({ roomId, sdp: JSON.stringify(answer) });
      setStatus("Connected");
    })();
  }, [room.data?.offerSdp, isCaller, roomId]);

  useEffect(() => {
    if (Platform.OS !== "web" || !room.data?.answerSdp || !isCaller || !pcRef.current) return;
    const pc = pcRef.current;
    if (pc.currentRemoteDescription) return;
    void (async () => {
      await pc.setRemoteDescription(JSON.parse(room.data!.answerSdp!) as RTCSessionDescriptionInit);
      setStatus("Connected");
    })();
  }, [room.data?.answerSdp, isCaller]);

  const hangUp = () => {
    end.mutate({ roomId }, { onSuccess: onClose });
    pcRef.current?.close();
    void utils.social.getVideoCall.invalidate();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Video chat</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{status}</Text>
      {error ? <Text style={{ color: "#c00", fontSize: 12 }}>{error}</Text> : null}

      {Platform.OS === "web" ? (
        <View style={styles.videoRow}>
          {/* @ts-expect-error web video element */}
          <video ref={localVideoRef} autoPlay muted playsInline style={styles.video} />
          {/* @ts-expect-error web video element */}
          <video ref={remoteVideoRef} autoPlay playsInline style={styles.video} />
        </View>
      ) : (
        <View style={[styles.nativePlaceholder, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13 }}>
            Friend video is fully supported on web. You can still text in the message thread.
          </Text>
        </View>
      )}

      <Pressable onPress={hangUp} style={[styles.hangUp, { backgroundColor: "#c0392b" }]}>
        {end.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>End call</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  videoRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  video: { width: 160, height: 120, borderRadius: 8, backgroundColor: "#111" } as unknown as object,
  nativePlaceholder: { padding: 24, borderRadius: 12, minHeight: 100, justifyContent: "center" },
  hangUp: { borderRadius: 10, padding: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
