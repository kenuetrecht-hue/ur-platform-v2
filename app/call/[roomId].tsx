import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";

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
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === "string" ? params.roomId : "";
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = readHashCallToken();
    setToken(fromHash);
    if (fromHash && typeof window !== "undefined" && window.history.replaceState) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

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
