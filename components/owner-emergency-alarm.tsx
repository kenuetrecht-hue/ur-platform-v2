import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import {
  armOwnerPhoneAlarm,
  presentLocalEmergencySignal,
  showWebEmergencyNotice,
} from "@/lib/owner-emergency-client";

export function OwnerEmergencyAlarm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPlatformOwner, isAuthenticated } = usePlatformOwner();
  const [snoozedId, setSnoozedId] = useState<string | null>(null);
  const lastSignaled = useRef<string | null>(null);

  const register = trpc.platformOps.registerOwnerPushDevice.useMutation();
  const emergency = trpc.platformOps.getOwnerEmergency.useQuery(undefined, {
    enabled: isAuthenticated && isPlatformOwner,
    refetchInterval: isAuthenticated && isPlatformOwner ? 15_000 : false,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!isAuthenticated || !isPlatformOwner) {
      lastSignaled.current = null;
      setSnoozedId(null);
      return;
    }
    void emergency.refetch();
    void armOwnerPhoneAlarm().then((token) => {
      if (!token) return;
      register.mutate({
        token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
      });
    });
    // Fire once per owner sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isPlatformOwner]);

  const state = emergency.data;
  const needsAttention = Boolean(isPlatformOwner && state?.active && state.incidentId);
  const showModal = Boolean(needsAttention && state?.incidentId !== snoozedId);

  useEffect(() => {
    if (!needsAttention || !state?.incidentId || state.incidentId === lastSignaled.current) return;
    lastSignaled.current = state.incidentId;
    const title = "UR website needs attention";
    const body = state.english;
    showWebEmergencyNotice(title, body);
    void presentLocalEmergencySignal(title, body);
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
    }
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "🚨 UR website needs attention";
    }
  }, [needsAttention, state?.incidentId, state?.english]);

  if (!isPlatformOwner) return null;

  return (
    <>
      {needsAttention ? (
        <Pressable
          onPress={() => router.push("/(tabs)/admin")}
          style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}
        >
          <Text style={styles.bannerText}>
            🚨 Website needs attention — {state?.title ?? "open Command Center"}
          </Text>
        </Pressable>
      ) : null}

      <Modal visible={showModal} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.siren}>🚨</Text>
            <Text style={styles.headline}>Website needs your attention</Text>
            <Text style={styles.title}>{state?.title}</Text>
            <Text style={styles.body}>{state?.english}</Text>
            <Pressable
              onPress={() => {
                setSnoozedId(state?.incidentId ?? null);
                router.push("/(tabs)/admin");
              }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Open Command Center</Text>
            </Pressable>
            <Pressable onPress={() => setSnoozedId(state?.incidentId ?? null)} style={styles.secondary}>
              <Text style={styles.secondaryText}>Keep the red banner — I’ll handle it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#991b1b",
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 50,
  },
  bannerText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(127, 29, 29, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  siren: { fontSize: 40, textAlign: "center" },
  headline: { color: "#fecaca", fontSize: 18, fontWeight: "800", textAlign: "center" },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  body: { color: "#e5e7eb", fontSize: 14, lineHeight: 20 },
  primary: { backgroundColor: "#dc2626", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondary: { paddingVertical: 8, alignItems: "center" },
  secondaryText: { color: "#fca5a5", fontSize: 13 },
});
