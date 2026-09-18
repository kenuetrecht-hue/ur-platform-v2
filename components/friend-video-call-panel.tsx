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
import { UR_STUN_ICE_SERVERS } from "@/lib/webrtc-ice";
import { openExternalCheckoutUrl } from "@/lib/web-checkout";

type Props = {
  roomId: string;
  friendUserId: string;
  isCaller: boolean;
  onClose: () => void;
  /** Native in-app browser uses this instead of the signed-in session. */
  accessToken?: string;
};

function formatConnectedMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function canUseWebRtc(): boolean {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/** 1-to-1 video — WebRTC on website/PWA; native app opens the same call page with camera. */
export function FriendVideoCallPanel({ roomId, isCaller, onClose, accessToken }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const appliedIce = useRef(new Set<string>());
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState<string | null>(null);
  const webRtc = canUseWebRtc();
  const tokenMode = Boolean(accessToken);

  const join = trpc.social.joinVideoCall.useMutation();
  const end = trpc.social.endVideoCall.useMutation();
  const heartbeat = trpc.social.heartbeatVideoCall.useMutation();
  const room = trpc.social.getVideoCall.useQuery(
    { roomId },
    { refetchInterval: 1000, enabled: Boolean(roomId) && !tokenMode },
  );
  const signalOffer = trpc.social.signalVideoOffer.useMutation();
  const signalAnswer = trpc.social.signalVideoAnswer.useMutation();
  const signalIce = trpc.social.signalIceCandidate.useMutation();
  const mintAccess = trpc.social.mintCallAccess.useMutation();

  const accessRoom = trpc.social.accessGetVideoCall.useQuery(
    { roomId, token: accessToken ?? "" },
    { refetchInterval: 1000, enabled: tokenMode && Boolean(roomId && accessToken) },
  );
  const accessJoin = trpc.social.accessJoinVideoCall.useMutation();
  const accessEnd = trpc.social.accessEndVideoCall.useMutation();
  const accessHeartbeat = trpc.social.accessHeartbeatVideoCall.useMutation();
  const accessOffer = trpc.social.accessSignalVideoOffer.useMutation();
  const accessAnswer = trpc.social.accessSignalVideoAnswer.useMutation();
  const accessIce = trpc.social.accessSignalIceCandidate.useMutation();
  const iceServersMut = trpc.social.iceServers.useMutation();
  const accessIceServersMut = trpc.social.accessIceServers.useMutation();

  const roomData = tokenMode ? accessRoom.data : room.data;
  const resolvedIsCaller = tokenMode ? Boolean(accessRoom.data?.isCaller) : isCaller;
  const readyToConnect = webRtc && (!tokenMode || Boolean(accessRoom.data));

  useEffect(() => {
    if (webRtc) return;
    setStatus("Opening camera in the secure browser…");
    join.mutate({ roomId });
    mintAccess.mutate(
      { roomId },
      {
        onSuccess: (res) => {
          setStatus("Camera is in the browser window. Keep this screen open to hang up.");
          void openExternalCheckoutUrl(res.url);
        },
        onError: (e) => setError(e.message),
      },
    );
  }, [roomId, webRtc]);

  useEffect(() => {
    if (!readyToConnect) return;
    let cancelled = false;
    const localStreamRef: { current?: MediaStream } = {};

    async function startWebRtc() {
      try {
        setStatus("Starting camera…");
        let iceServers = UR_STUN_ICE_SERVERS;
        try {
          const ice =
            tokenMode && accessToken
              ? await accessIceServersMut.mutateAsync({ roomId, token: accessToken })
              : await iceServersMut.mutateAsync({ roomId });
          if (ice.iceServers?.length) iceServers = ice.iceServers;
        } catch {
          /* STUN still works if TURN is not configured. */
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play();
        }

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current && ev.streams[0]) {
            remoteVideoRef.current.srcObject = ev.streams[0];
            void remoteVideoRef.current.play();
          }
        };

        pc.onicecandidate = (ev) => {
          if (!ev.candidate) return;
          const candidate = JSON.stringify(ev.candidate);
          if (tokenMode && accessToken) {
            accessIce.mutate({ roomId, token: accessToken, candidate });
          } else {
            signalIce.mutate({ roomId, candidate });
          }
        };

        if (tokenMode && accessToken) {
          await accessJoin.mutateAsync({ roomId, token: accessToken });
        } else {
          await join.mutateAsync({ roomId });
        }

        if (resolvedIsCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const sdp = JSON.stringify(offer);
          if (tokenMode && accessToken) {
            await accessOffer.mutateAsync({ roomId, token: accessToken, sdp });
          } else {
            await signalOffer.mutateAsync({ roomId, sdp });
          }
          setStatus("Calling…");
        } else {
          setStatus("Waiting for the other person…");
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
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, resolvedIsCaller, readyToConnect, tokenMode, accessToken]);

  useEffect(() => {
    if (!webRtc || !roomData?.offerSdp || resolvedIsCaller || !pcRef.current) return;
    const pc = pcRef.current;
    if (pc.currentRemoteDescription) return;
    void (async () => {
      await pc.setRemoteDescription(JSON.parse(roomData.offerSdp!) as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const sdp = JSON.stringify(answer);
      if (tokenMode && accessToken) {
        await accessAnswer.mutateAsync({ roomId, token: accessToken, sdp });
      } else {
        await signalAnswer.mutateAsync({ roomId, sdp });
      }
      setStatus("Connected");
    })();
  }, [roomData?.offerSdp, resolvedIsCaller, roomId, webRtc, tokenMode, accessToken]);

  useEffect(() => {
    if (!webRtc || !roomData?.answerSdp || !resolvedIsCaller || !pcRef.current) return;
    const pc = pcRef.current;
    if (pc.currentRemoteDescription) return;
    void (async () => {
      await pc.setRemoteDescription(JSON.parse(roomData.answerSdp!) as RTCSessionDescriptionInit);
      setStatus("Connected");
    })();
  }, [roomData?.answerSdp, resolvedIsCaller, webRtc]);

  useEffect(() => {
    if (!webRtc || !pcRef.current || !roomData?.iceCandidates?.length) return;
    const pc = pcRef.current;
    for (const row of roomData.iceCandidates) {
      if (appliedIce.current.has(row.candidate)) continue;
      appliedIce.current.add(row.candidate);
      try {
        void pc.addIceCandidate(JSON.parse(row.candidate) as RTCIceCandidateInit);
      } catch {
        /* Ignore malformed candidates. */
      }
    }
  }, [roomData?.iceCandidates, webRtc]);

  useEffect(() => {
    if (!roomId) return;
    const tick = () => {
      if (tokenMode && accessToken) {
        accessHeartbeat.mutate({ roomId, token: accessToken });
      } else {
        heartbeat.mutate({ roomId });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [roomId, tokenMode, accessToken]);

  const hangUp = () => {
    if (tokenMode && accessToken) {
      accessEnd.mutate({ roomId, token: accessToken }, { onSuccess: onClose });
    } else {
      end.mutate({ roomId }, { onSuccess: onClose });
    }
    pcRef.current?.close();
    void utils.social.getVideoCall.invalidate();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Video call</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{status}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
        Time on call: {formatConnectedMs(roomData?.connectedMs ?? 0)}
      </Text>
      {error ? <Text style={{ color: "#c00", fontSize: 12 }}>{error}</Text> : null}

      {webRtc ? (
        <View style={styles.videoRow}>
          {/* @ts-expect-error web video element */}
          <video ref={localVideoRef} autoPlay muted playsInline style={styles.video} />
          {/* @ts-expect-error web video element */}
          <video ref={remoteVideoRef} autoPlay playsInline style={styles.video} />
        </View>
      ) : (
        <View style={[styles.nativePlaceholder, { backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.muted, textAlign: "center", fontSize: 13, lineHeight: 19 }}>
            Same call as the website. Your camera opens in the secure browser so you can see and hear
            each other. Hang up here when you are done.
          </Text>
        </View>
      )}

      <Pressable onPress={hangUp} style={[styles.hangUp, { backgroundColor: "#c0392b" }]}>
        {end.isPending || accessEnd.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>End call</Text>
        )}
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
