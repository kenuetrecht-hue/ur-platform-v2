import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View, Text } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

function readHashCallToken(): string {
  if (typeof window === "undefined") return "";
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) return "";
  try {
    const params = new URLSearchParams(raw.includes("=") ? raw : `t=${raw}`);
    return params.get("t")?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Same WebRTC call as Social — used by the native in-app browser so camera works. */
export default function CallRoomScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const params = useLocalSearchParams<{ roomId?: string; pickUp?: string; decline?: string }>();
  const roomId = typeof params.roomId === "string" ? params.roomId : "";
  const pickingUp = params.pickUp === "1";
  const declining = params.decline === "1";
  const [token, setToken] = useState<string | null>(null);
  const endCall = trpc.social.endVideoCall.useMutation({
    onSettled: () => router.replace("/messages"),
  });

  useEffect(() => {
    if (!declining || !roomId || !isAuthenticated || endCall.isPending || endCall.isSuccess) return;
    endCall.mutate({ roomId });
  }, [declining, roomId, isAuthenticated]);

  useEffect(() => {
    const fromHash = readHashCallToken();
    setToken(fromHash);
    if (fromHash && typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  if (pickingUp || declining) {
    if (isLoading) {
      return (
        <ScreenContainer>
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Connecting the call…</Text>
          </View>
        </ScreenContainer>
      );
    }
    if (!isAuthenticated) {
      return (
        <ScreenContainer>
          <View style={{ padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Sign in to pick up this call</Text>
            <Text>This opens the video call with the person who called you.</Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={{ fontWeight: "800" }}>Sign in</Text>
            </Pressable>
          </View>
        </ScreenContainer>
      );
    }
    if (!roomId || declining) {
      return (
        <ScreenContainer>
          <View style={{ padding: 24 }}>
            <Text>Closing the call…</Text>
          </View>
        </ScreenContainer>
      );
    }
    return (
      <ScreenContainer>
        <FriendVideoCallPanel
          roomId={roomId}
          friendUserId="caller"
          peerLabel="the person who called"
          isCaller={false}
          onClose={() => router.replace("/messages")}
        />
      </ScreenContainer>
    );
  }

  if (token === null) {
    return (
      <ScreenContainer>
        <TabScreenHeader compact icon="📹" title="Video call" />
        <View style={{ padding: 16 }}>
          <Text>Connecting…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!roomId || !token) {
    return (
      <ScreenContainer>
        <TabScreenHeader compact icon="📹" title="Video call" />
        <View style={{ padding: 16 }}>
          <Text>This call link is missing. Open the call from Social in the app.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TabScreenHeader compact icon="📹" title="Video call" />
      <View style={{ padding: 16 }}>
        <FriendVideoCallPanel
          roomId={roomId}
          friendUserId="peer"
          isCaller={true}
          accessToken={token}
          onClose={() => router.back()}
        />
      </View>
    </ScreenContainer>
  );
}
