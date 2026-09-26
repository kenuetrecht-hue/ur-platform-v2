import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";
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
export function IncomingVideoCallDock() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const incoming = trpc.social.incomingVideoCalls.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 2500,
  });
  const [active, setActive] = useState<{ roomId: string; peerUserId: string; peerLabel: string } | null>(null);
  const decline = trpc.social.endVideoCall.useMutation();
  const [pushReady, setPushReady] = useState(false);
  const registerRing = trpc.social.registerCallRing.useMutation();
  const registerRef = useRef(registerRing.mutateAsync);
  registerRef.current = registerRing.mutateAsync;
  const publicKey = trpc.social.callRingPublicKey.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  }).data?.publicKey;
  const ringing = (incoming.data ?? []).filter((call) => call.status === "ringing" && call.id !== active?.roomId);
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
    if (!isAuthenticated || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "ur-incoming-call") void incoming.refetch();
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
        first.kind === "creator" ? "A paid call is ringing on UR" : "A friend is calling you on UR",
      );
    }
    return () => stopCallRingtone();
  }, [ringKey, pushReady]);

  if (!isAuthenticated || (!active && ringing.length === 0)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={
        Boolean(ringing[0]) && !active
          ? {
              position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 260,
            }
          : { position: "absolute", top: 64, left: 12, right: 12, zIndex: 50, gap: 8 }
      }
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
            onPress={() =>
              setActive({
                roomId: ringing[0].id,
                peerUserId: ringing[0].callerUserId,
                peerLabel: ringing[0].callerName || "A friend",
              })
            }
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
    </View>
  );
}
