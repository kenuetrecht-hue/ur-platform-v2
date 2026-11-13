import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import {
  armOwnerPhoneAlarm,
  presentLocalEmergencySignal,
  showWebEmergencyNotice,
} from "@/lib/owner-emergency-client";
import { isOwnerAuditClearanceRequest } from "@/lib/owner-audit-clearance";

const CLOSED_KEY = "ur-owner-emergency-closed";

function readClosedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(CLOSED_KEY);
  } catch {
    return null;
  }
}

function writeClosedId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CLOSED_KEY, id);
  } catch {
    /* private browsing */
  }
}

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
    setSnoozedId(readClosedId());
  }, []);

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
  const auditClearance = isOwnerAuditClearanceRequest(`${state?.title ?? ""}\n${state?.problem ?? ""}`);
  const needsAttention = Boolean(
    isPlatformOwner && state?.active && state.incidentId && !auditClearance,
  );
  const showing = Boolean(needsAttention && state?.incidentId !== snoozedId);

  function closeAlarm() {
    const id = state?.incidentId;
    if (!id) return;
    writeClosedId(id);
    setSnoozedId(id);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "UR Platform";
    }
  }

  useEffect(() => {
    if (!showing || !state?.incidentId || state.incidentId === lastSignaled.current) return;
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
  }, [showing, state?.incidentId, state?.english]);

  if (!isPlatformOwner || !showing) return null;

  return (
    <View style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}>
      <Text style={styles.bannerText}>
        Website needs attention — {state?.title ?? "open Command Center"}
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={closeAlarm} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            closeAlarm();
            router.push("/(tabs)/admin");
          }}
          style={styles.openBtn}
        >
          <Text style={styles.openText}>Open Command Center</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#991b1b",
    paddingHorizontal: 14,
    paddingBottom: 12,
    zIndex: 50,
    gap: 10,
  },
  bannerText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  closeBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    minWidth: 120,
    alignItems: "center",
  },
  closeText: {
    color: "#991b1b",
    fontWeight: "800",
    fontSize: 16,
  },
  openBtn: {
    backgroundColor: "#7f1d1d",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  openText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
