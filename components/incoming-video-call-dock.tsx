import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { LETTERING_ON_COLOR } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";

/** Rings on every signed-in page so a social video call is not missed off the Friends tab. */
export function IncomingVideoCallDock() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const incoming = trpc.social.incomingVideoCalls.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 4000,
  });
  const [active, setActive] = useState<{ roomId: string; peerUserId: string } | null>(null);
  const ringing = (incoming.data ?? []).filter((call) => call.status === "ringing" && call.id !== active?.roomId);

  if (!isAuthenticated || (!active && ringing.length === 0)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 64, left: 12, right: 12, zIndex: 50, gap: 8 }}
    >
      {active ? (
        <FriendVideoCallPanel
          roomId={active.roomId}
          friendUserId={active.peerUserId}
          isCaller={false}
          onClose={() => setActive(null)}
        />
      ) : null}
      {ringing.map((call) => (
        <View
          key={call.id}
          style={{
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 12,
            padding: 12,
            backgroundColor: "rgba(7, 8, 13, 0.92)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800" }}>📹 Incoming video call</Text>
            <Text style={{ color: LETTERING_ON_COLOR, fontSize: 11 }}>
              {call.kind === "creator" ? "Paid 1-to-1 call · tap Answer" : "From a friend · tap Answer"}
            </Text>
          </View>
          <Pressable
            onPress={() => setActive({ roomId: call.id, peerUserId: call.callerUserId })}
            style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Answer</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
