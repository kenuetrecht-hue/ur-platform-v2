import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { createPortal } from "react-dom";
import { useGlobalSearchParams } from "expo-router";
import { FriendVideoCallPanel, primeCallAudio } from "@/components/friend-video-call-panel";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import {
  ensureCallRingPermission,
  showForegroundCallNotice,
  startCallRingtone,
  stopCallRingtone,
  subscribeCallRing,
  unlockCallRingtone,
} from "@/lib/call-ring-client";
import { LETTERING_ON_COLOR } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";

/** Rings on every signed-in page so a social video call is not missed off the Friends tab. */
function callRoomId(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(raw) ? raw : "";
}

export function IncomingVideoCallDock() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const params = useGlobalSearchParams<{ answerCall?: string; declineCall?: string }>();
  const answerFromLink = callRoomId(params.answerCall);
  const declineFromLink = callRoomId(params.declineCall);
  const incoming = trpc.social.incomingVideoCalls.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 1500,
    staleTime: 0,
  });
  const [active, setActive] = useState<{ roomId: string; peerUserId: string; peerLabel: string } | null>(null);
  const decline = trpc.social.endVideoCall.useMutation();
  const declineRef = useRef(decline.mutate);
  declineRef.current = decline.mutate;
  const declinedRooms = useRef(new Set<string>());
  const openedFromLink = useRef("");
  const [pushReady, setPushReady] = useState(false);
  const registerRing = trpc.social.registerCallRing.useMutation();
  const registerRef = useRef(registerRing.mutateAsync);
  registerRef.current = registerRing.mutateAsync;
  const publicKey = trpc.social.callRingPublicKey.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  }).data?.publicKey;
  const ringing = (incoming.data ?? []).filter((call) => call.status === "ringing" && call.id !== active?.roomId);
  const notices = trpc.social.callNotices.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 4000,
    staleTime: 0,
  });
  const dismissNotice = trpc.social.dismissCallNotice.useMutation({
    onSuccess: () => void notices.refetch(),
  });
  const ringKey = ringing.map((call) => call.id).join(",");
  const ringingRef = useRef(ringing);
  ringingRef.current = ringing;

  useEffect(() => {
    if (!isAuthenticated) return;
    const unlock = () => {
      unlockCallRingtone();
      void ensureCallRingPermission();
    };
    if (typeof window !== "undefined") window.addEventListener("pointerdown", unlock);
    return () => {
      if (typeof window !== "undefined") window.removeEventListener("pointerdown", unlock);
      stopCallRingtone();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !answerFromLink || openedFromLink.current === answerFromLink) return;
    openedFromLink.current = answerFromLink;
    const match = (incoming.data ?? []).find((call) => call.id === answerFromLink);
    setActive({
      roomId: answerFromLink,
      peerUserId: match?.callerUserId ?? "",
      peerLabel: match?.callerName || "A friend",
    });
  }, [isAuthenticated, answerFromLink, incoming.data]);

  useEffect(() => {
    if (!isAuthenticated || !declineFromLink || declinedRooms.current.has(declineFromLink)) return;
    declinedRooms.current.add(declineFromLink);
    declineRef.current({ roomId: declineFromLink });
  }, [isAuthenticated, declineFromLink]);

  useEffect(() => {
    if (!isAuthenticated || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; roomId?: string } | null;
      if (!data || typeof data.type !== "string") return;
      if (data.type === "ur-incoming-call") void incoming.refetch();
      const roomId = callRoomId(data.roomId);
      if (data.type === "ur-answer-call" && roomId) {
        setActive({ roomId, peerUserId: "", peerLabel: "A friend" });
      }
      if (data.type === "ur-decline-call" && roomId && !declinedRooms.current.has(roomId)) {
        declinedRooms.current.add(roomId);
        declineRef.current({ roomId });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [isAuthenticated, incoming]);

  useEffect(() => {
    if (!isAuthenticated || !publicKey) return;
    let cancelled = false;
    void subscribeCallRing({
      publicKey,
      register: (subscription) => registerRef.current(subscription),
    }).then((ok) => {
      if (!cancelled && ok) setPushReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, publicKey]);

  useEffect(() => {
    if (!ringKey) return;
    startCallRingtone();
    const first = ringingRef.current[0];
    if (first && !pushReady) {
      showForegroundCallNotice(
        first.id,
        first.kind === "creator"
          ? "A paid call is ringing on UR Platform. Tap Answer to pick up."
          : `${first.callerName || "A friend"} is calling you on UR Platform. Tap Answer to pick up.`,
      );
    }
    return () => stopCallRingtone();
  }, [ringKey, pushReady]);

  if (!isAuthenticated || (!active && ringing.length === 0 && (notices.data ?? []).length === 0)) return null;

  const screen = (
    <View
      pointerEvents="box-none"
      style={{
        position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483000,
      }}
    >
      {active ? (
        <FriendVideoCallPanel
          roomId={active.roomId}
          friendUserId={active.peerUserId}
          peerLabel={active.peerLabel}
          isCaller={false}
          onClose={() => setActive(null)}
        />
      ) : null}
      {ringing[0] ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 260,
            backgroundColor: "rgba(7, 8, 13, 0.96)",
            padding: 24,
            justifyContent: "center",
            gap: 14,
          }}
        >
          <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800", fontSize: 28 }}>
            {ringing[0].callerName || "A friend"} is calling you
          </Text>
          <Text style={{ color: LETTERING_ON_COLOR, fontSize: 15 }}>
            Incoming video call. Only you are being called.
          </Text>
          <Pressable
            onPress={() => {
              primeCallAudio();
              setActive({
                roomId: ringing[0].id,
                peerUserId: ringing[0].callerUserId,
                peerLabel: ringing[0].callerName || "A friend",
              });
            }}
            style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>Answer</Text>
          </Pressable>
          <Pressable
            onPress={() => decline.mutate({ roomId: ringing[0].id })}
            style={{ backgroundColor: "#c0392b", borderRadius: 12, paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>Decline</Text>
          </Pressable>
        </View>
      ) : null}
      {!ringing[0] && !active
        ? (notices.data ?? []).slice(-1).map((notice) => (
            <View
              key={notice.id}
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                right: 12,
                backgroundColor: "#111827",
                borderRadius: 12,
                padding: 14,
                gap: 8,
              }}
            >
              <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800", fontSize: 16 }}>
                {notice.callerName} tried to call you on UR Platform
              </Text>
              <Pressable
                onPress={() => dismissNotice.mutate({ noticeId: notice.id })}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Got it</Text>
              </Pressable>
            </View>
          ))
        : null}
    </View>
  );

  if (Platform.OS === "web" && typeof document !== "undefined") {
    return createPortal(screen, document.body);
  }
  return screen;
}
