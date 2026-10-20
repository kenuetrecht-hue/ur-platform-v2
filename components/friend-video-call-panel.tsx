import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";
import {
  CALL_AUDIO_CONSTRAINTS,
  CALL_AUDIO_MAX_BITRATE,
  CALL_VIDEO_CONSTRAINTS,
  CALL_VIDEO_MAX_BITRATE,
  CALL_VIDEO_MAX_FRAMERATE,
} from "@/lib/call-media-profile";
import { UR_STUN_ICE_SERVERS } from "@/lib/webrtc-ice";
import { openExternalCheckoutUrl } from "@/lib/web-checkout";

type Props = {
  roomId: string;
  friendUserId: string;
  /** The one person this call is for. */
  peerLabel?: string;
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

function armCallAudio(): void {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  // play-and-record keeps the mic open and plays their voice. "playback" silences a call.
  if (session) session.type = "play-and-record";
}

function playCallMedia(el: HTMLMediaElement): Promise<void> {
  const local = el.dataset.localPreview === "1";
  el.muted = local;
  el.volume = 1;
  armCallAudio();
  return el.play();
}

function preferCallCodecs(pc: RTCPeerConnection): void {
  if (typeof RTCRtpSender === "undefined" || !RTCRtpSender.getCapabilities) return;
  const video = RTCRtpSender.getCapabilities("video");
  const audio = RTCRtpSender.getCapabilities("audio");
  const rank = (mime: string, kind: "video" | "audio") => {
    if (kind === "video" && /H264/i.test(mime)) return 0;
    if (kind === "video" && /VP8/i.test(mime)) return 1;
    if (kind === "audio" && /opus/i.test(mime)) return 0;
    return 5;
  };
  for (const transceiver of pc.getTransceivers()) {
    const kind = transceiver.sender.track?.kind;
    if (kind !== "video" && kind !== "audio") continue;
    const caps = kind === "video" ? video : audio;
    if (!caps || !transceiver.setCodecPreferences) continue;
    const codecs = [...caps.codecs].sort((a, b) => rank(a.mimeType, kind) - rank(b.mimeType, kind));
    try {
      transceiver.setCodecPreferences(codecs);
    } catch {
      /* This browser keeps its own codec order. */
    }
  }
}

async function tuneCallSenders(pc: RTCPeerConnection): Promise<void> {
  for (const sender of pc.getSenders()) {
    const track = sender.track;
    if (!track) continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      const encoding = params.encodings[0];
      if (!encoding) continue;
      if (track.kind === "video") {
        params.degradationPreference = "maintain-resolution";
        encoding.maxBitrate = CALL_VIDEO_MAX_BITRATE;
        encoding.maxFramerate = CALL_VIDEO_MAX_FRAMERATE;
        encoding.scaleResolutionDownBy = 1;
      } else if (track.kind === "audio") {
        encoding.maxBitrate = CALL_AUDIO_MAX_BITRATE;
      }
      await sender.setParameters(params);
    } catch {
      /* The browser keeps its own rate if this phone rejects the cap. */
    }
  }
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
function ensureRemoteAudio(current: HTMLAudioElement | null): HTMLAudioElement | null {
  if (typeof document === "undefined") return current;
  if (current) return current;
  const el = document.createElement("audio");
  el.autoplay = true;
  el.setAttribute("playsinline", "true");
  el.style.width = "1px";
  el.style.height = "1px";
  document.body.appendChild(el);
  return el;
}

export function FriendVideoCallPanel({ roomId, isCaller, onClose, accessToken, peerLabel }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const relayReadyRef = useRef(false);
  const localPreviewStream = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const speakerCtxRef = useRef<AudioContext | null>(null);
  const speakerSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const appliedIce = useRef(new Set<string>());
  const closedRef = useRef(false);
  const [status, setStatus] = useState("Connecting…");
  const [remoteReady, setRemoteReady] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const webRtc = canUseWebRtc();
  const tokenMode = Boolean(accessToken);

  const join = trpc.social.joinVideoCall.useMutation();
  const end = trpc.social.endVideoCall.useMutation();
  const heartbeat = trpc.social.heartbeatVideoCall.useMutation();
  const room = trpc.social.getVideoCall.useQuery(
    { roomId },
    { refetchInterval: 1000, staleTime: 0, enabled: Boolean(roomId) && !tokenMode },
  );
  const signalOffer = trpc.social.signalVideoOffer.useMutation();
  const signalAnswer = trpc.social.signalVideoAnswer.useMutation();
  const signalIce = trpc.social.signalIceCandidate.useMutation();
  const mintAccess = trpc.social.mintCallAccess.useMutation();

  const accessRoom = trpc.social.accessGetVideoCall.useQuery(
    { roomId, token: accessToken ?? "" },
    { refetchInterval: 1000, staleTime: 0, enabled: tokenMode && Boolean(roomId && accessToken) },
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
    if (!webRtc || typeof document === "undefined") return;
    const host = stageRef.current;
    if (!host) return;
    const make = (local: boolean) => {
      const el = document.createElement("video");
      el.autoplay = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "true");
      el.dataset.localPreview = local ? "1" : "0";
      el.muted = local;
      el.style.width = "100%";
      el.style.height = local ? "28vh" : "52vh";
      el.style.objectFit = "cover";
      el.style.background = "#111";
      el.style.borderRadius = "12px";
      return el;
    };
    const local = make(true);
    const remote = make(false);
    host.replaceChildren(local, remote);
    localVideoRef.current = local;
    remoteVideoRef.current = remote;
    if (localPreviewStream.current) {
      local.srcObject = localPreviewStream.current;
      playCallMedia(local);
    }
    if (remoteStreamRef.current) {
      remote.srcObject = remoteStreamRef.current;
      void playCallMedia(remote).catch(() => undefined);
    }
    return () => {
      local.srcObject = null;
      remote.srcObject = null;
      host.replaceChildren();
    };
  }, [webRtc]);

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
        armCallAudio();
        let iceServers = UR_STUN_ICE_SERVERS;
        let relayReady = false;
        try {
          const ice =
            tokenMode && accessToken
              ? await accessIceServersMut.mutateAsync({ roomId, token: accessToken })
              : await iceServersMut.mutateAsync({ roomId });
          if (ice.iceServers?.length) iceServers = ice.iceServers;
          relayReady = ice.relayReady === true;
          relayReadyRef.current = relayReady;
          if (!relayReady) {
            setError("The relay between the two phones is not connected, so picture and voice cannot cross yet.");
          }
        } catch {
          relayReadyRef.current = false;
          setError("The call relay did not answer. Stay on the call, or hang up and try again.");
        }
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: CALL_VIDEO_CONSTRAINTS,
            audio: CALL_AUDIO_CONSTRAINTS,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
        const micTracks = stream.getAudioTracks();
        if (micTracks.length === 0) {
          setError("Microphone is off, so they cannot hear you. Allow the microphone and call again.");
        }
        micTracks.forEach((track) => {
          track.enabled = true;
          track.contentHint = "speech";
        });
        stream.getVideoTracks().forEach((track) => {
          track.contentHint = "detail";
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        localPreviewStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          try {
            await localVideoRef.current.play();
          } catch {
            /* The stream is attached even when autoplay is blocked. */
          }
        }

        const pc = new RTCPeerConnection({
          iceServers,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
          iceCandidatePoolSize: 2,
        });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        preferCallCodecs(pc);

        pc.ontrack = (ev) => {
          if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
          const remote = remoteStreamRef.current;
          if (!remote.getTracks().some((track) => track.id === ev.track.id)) remote.addTrack(ev.track);
          ev.track.enabled = true;
          const heard = new MediaStream(remote.getTracks());
          remoteStreamRef.current = heard;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = heard;
            remoteVideoRef.current.muted = false;
            void playCallMedia(remoteVideoRef.current).catch(() => undefined);
          }
          if (ev.track.kind === "audio") {
            remoteAudioRef.current = ensureRemoteAudio(remoteAudioRef.current);
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = new MediaStream(heard.getAudioTracks());
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setStatus("Connected · encrypted");
            setError(null);
            void tuneCallSenders(pc);
          }
          if (pc.iceConnectionState === "failed") {
            setError(
              relayReady
                ? "The two phones could not connect. Allow the camera and microphone on both phones, then call again."
                : "The relay that carries the picture and voice between the two phones did not connect. Call again.",
            );
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

        setMediaReady(true);
        if (resolvedIsCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await tuneCallSenders(pc);
          const sdp = JSON.stringify(offer);
          if (tokenMode && accessToken) {
            await accessOffer.mutateAsync({ roomId, token: accessToken, sdp });
          } else {
            await signalOffer.mutateAsync({ roomId, sdp });
          }
          setStatus("Calling… waiting for them to answer");
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
      setMediaReady(false);
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      remoteAudioRef.current?.remove();
      remoteAudioRef.current = null;
      speakerSourceRef.current?.disconnect();
      speakerSourceRef.current = null;
      void speakerCtxRef.current?.close().catch(() => undefined);
      speakerCtxRef.current = null;
    };
  }, [roomId, resolvedIsCaller, readyToConnect, tokenMode, accessToken]);

  useEffect(() => {
    if (!webRtc || !mediaReady || !roomData?.offerSdp || resolvedIsCaller || !pcRef.current) return;
    const pc = pcRef.current;
    if (pc.currentRemoteDescription) return;
    void (async () => {
      try {
        await pc.setRemoteDescription(JSON.parse(roomData.offerSdp!) as RTCSessionDescriptionInit);
        setRemoteReady((n) => n + 1);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await tuneCallSenders(pc);
        const sdp = JSON.stringify(answer);
        if (tokenMode && accessToken) {
          await accessAnswer.mutateAsync({ roomId, token: accessToken, sdp });
        } else {
          await signalAnswer.mutateAsync({ roomId, sdp });
        }
        setStatus("Answered · waiting for picture and voice");
      } catch {
        setError("The call setup did not finish. Hang up and call again.");
      }
    })();
  }, [roomData?.offerSdp, resolvedIsCaller, roomId, webRtc, tokenMode, accessToken, mediaReady]);

  useEffect(() => {
    if (!webRtc || !mediaReady || !roomData?.answerSdp || !resolvedIsCaller || !pcRef.current) return;
    const pc = pcRef.current;
    if (pc.currentRemoteDescription) return;
    void (async () => {
      try {
        await pc.setRemoteDescription(JSON.parse(roomData.answerSdp!) as RTCSessionDescriptionInit);
        setRemoteReady((n) => n + 1);
        setStatus("Answered · waiting for picture and voice");
      } catch {
        setError("The call setup did not finish. Hang up and call again.");
      }
    })();
  }, [roomData?.answerSdp, resolvedIsCaller, webRtc, mediaReady]);

  useEffect(() => {
    if (!webRtc || !mediaReady || !pcRef.current || !roomData?.iceCandidates?.length) return;
    const pc = pcRef.current;
    if (!pc.remoteDescription) return;
    const selfId = resolvedIsCaller ? roomData.callerUserId : roomData.calleeUserId;
    for (const row of roomData.iceCandidates) {
      if (row.fromUserId === selfId) continue;
      if (appliedIce.current.has(row.candidate)) continue;
      appliedIce.current.add(row.candidate);
      void pc.addIceCandidate(JSON.parse(row.candidate) as RTCIceCandidateInit).catch(() => {
        appliedIce.current.delete(row.candidate);
      });
    }
  }, [
    roomData?.iceCandidates,
    roomData?.callerUserId,
    roomData?.calleeUserId,
    resolvedIsCaller,
    webRtc,
    mediaReady,
    remoteReady,
  ]);

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
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [roomId, tokenMode, accessToken]);

  useEffect(() => {
    if (roomData?.status !== "ended" || closedRef.current) return;
    closedRef.current = true;
    pcRef.current?.close();
    pcRef.current = null;
    onClose();
  }, [roomData?.status, onClose]);

  const hangUp = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (tokenMode && accessToken) {
      accessEnd.mutate({ roomId, token: accessToken });
    } else {
      end.mutate({ roomId });
    }
    pcRef.current?.close();
    pcRef.current = null;
    void utils.social.getVideoCall.invalidate();
    onClose();
  };

  const turnSoundOn = () => {
    armCallAudio();
    const remote = remoteStreamRef.current ?? new MediaStream();
    for (const receiver of pcRef.current?.getReceivers() ?? []) {
      const track = receiver.track;
      if (!track || track.kind !== "audio") continue;
      if (!remote.getTracks().some((row) => row.id === track.id)) remote.addTrack(track);
    }
    remoteStreamRef.current = remote;
    const voice = remote.getAudioTracks();
    voice.forEach((track) => {
      track.enabled = true;
    });
    localPreviewStream.current?.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    if (voice.length === 0) {
      setError("Their voice has not arrived yet. Stay on the call a moment, then tap Turn sound on.");
      return;
    }
    const picture = remoteVideoRef.current;
    if (picture && remote) {
      picture.srcObject = new MediaStream(remote.getTracks());
      picture.muted = false;
    }
    remoteAudioRef.current = ensureRemoteAudio(remoteAudioRef.current);
    const speaker = picture ?? remoteAudioRef.current;
    if (!speaker) {
      setError("Tap Turn sound on again. The phone blocked the voice.");
      return;
    }
    void playCallMedia(speaker)
      .then(() => {
        setError(null);
        setStatus("Sound is on");
      })
      .catch(() => {
        if (!speaker || typeof AudioContext === "undefined") {
          setError("Tap Turn sound on again. The phone blocked the voice.");
          return;
        }
        try {
          speakerSourceRef.current?.disconnect();
          const ctx = speakerCtxRef.current ?? new AudioContext();
          speakerCtxRef.current = ctx;
          void ctx.resume();
          const source = ctx.createMediaStreamSource(new MediaStream(voice));
          source.connect(ctx.destination);
          speakerSourceRef.current = source;
          setError(null);
          setStatus("Sound is on");
        } catch {
          setError("Tap Turn sound on again. The phone blocked the voice.");
        }
      });
  };

  const who = peerLabel?.trim() || "this person";

  const tree = (
    <View
      style={[
        styles.root,
        Platform.OS === "web" ? ({ position: "fixed" } as object) : null,
        { backgroundColor: "rgba(7, 8, 13, 0.96)", borderColor: colors.border },
      ]}
    >
      <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800", fontSize: 22 }}>
        {resolvedIsCaller ? `Calling ${who}` : `Talking with ${who}`}
      </Text>
      <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13 }}>
        {resolvedIsCaller
          ? "Only this person is being called."
          : "This is the video call with the person who called you."}
      </Text>
      <Text style={{ color: LETTERING_ON_COLOR, fontSize: 12 }}>{status}</Text>
      <Text style={{ color: LETTERING_ON_COLOR, fontSize: 12, fontVariant: ["tabular-nums"] }}>
        Time on call: {formatConnectedMs(roomData?.connectedMs ?? 0)}
      </Text>
      {error ? <Text style={{ color: "#ffb4b4", fontSize: 12 }}>{error}</Text> : null}

      {webRtc ? (
        <View style={styles.videoRow}>
          {/* @ts-expect-error web host for the real camera elements */}
          <div ref={stageRef} style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }} />
        </View>
      ) : (
        <View style={[styles.nativePlaceholder, { backgroundColor: "#FFFFFF" }]}>
          <Text style={{ color: LETTERING_ON_WHITE, textAlign: "center", fontSize: 13, lineHeight: 19 }}>
            Same call as the website. Your camera opens in the secure browser so you can see and hear
            each other. Hang up here when you are done.
          </Text>
        </View>
      )}

      {webRtc ? (
        <Pressable onPress={turnSoundOn} style={[styles.sound, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Turn sound on</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={hangUp} style={[styles.hangUp, { backgroundColor: "#c0392b" }]}>
        <Text style={styles.btnText}>End call</Text>
      </Pressable>
    </View>
  );

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const { createPortal } = require("react-dom") as typeof import("react-dom");
    return createPortal(tree, document.body);
  }
  return tree;
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    padding: 16,
    paddingBottom: 120,
    gap: 10,
    justifyContent: "flex-end",
  },
  videoRow: { flex: 1, gap: 8 },
  video: { width: "100%", flex: 1, minHeight: 160, borderRadius: 12, backgroundColor: "#111", objectFit: "cover" } as unknown as object,
  nativePlaceholder: { padding: 24, borderRadius: 12, minHeight: 100, justifyContent: "center" },
  sound: { borderRadius: 10, padding: 12, alignItems: "center" },
  hangUp: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
