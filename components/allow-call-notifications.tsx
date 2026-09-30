import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { subscribeCallRing } from "@/lib/call-ring-client";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { readStandalone } from "@/lib/web-install-prompt";
import { trpc } from "@/lib/trpc";

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as object) : null;

function iphoneBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function AllowCallNotifications({ tone = "card" }: { tone?: "card" | "landing" }) {
  const { isAuthenticated } = useAuth();
  const publicKey = trpc.social.callRingPublicKey.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  }).data?.publicKey;
  const registerRing = trpc.social.registerCallRing.useMutation();
  const [status, setStatus] = useState<string | null>(null);
  const onDark = tone === "landing";

  async function allow(): Promise<void> {
    if (!isAuthenticated) {
      setStatus("Sign in first. Then open Profile and tap Allow notifications.");
      return;
    }
    if (iphoneBrowser() && !readStandalone()) {
      setStatus(
        "An iPhone will not send notifications from the Safari tab. Add UR to the Home Screen, open that icon, then tap Allow notifications.",
      );
      return;
    }
    if (Platform.OS === "web" && typeof Notification === "undefined") {
      setStatus("This browser is not offering notifications. Open the installed UR icon and tap Allow notifications.");
      return;
    }
    if (Platform.OS === "web") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(
          "Notifications are blocked. In the phone settings for Chrome or UR, allow notifications, then tap this again.",
        );
        return;
      }
      if (!publicKey) {
        setStatus("UR is not ready to send alerts yet. Stay signed in and tap this again in a moment.");
        return;
      }
      const ok = await subscribeCallRing({
        publicKey,
        register: (subscription) => registerRing.mutateAsync(subscription),
      });
      setStatus(
        ok
          ? "Notifications are on. Incoming calls can alert this phone."
          : "The phone did not save the alert. Stay signed in, allow notifications in phone settings, and tap this again.",
      );
      return;
    }
    const Notifications = await import("expo-notifications");
    const permission = await Notifications.requestPermissionsAsync();
    setStatus(
      permission.granted
        ? "Notifications are on. Incoming calls can alert this phone while UR is open."
        : "Notifications are blocked. In the phone settings for UR, allow notifications, then tap this again.",
    );
  }

  return (
    <View style={onDark ? styles.landing : styles.card}>
      <Text style={onDark ? styles.landingTitle : styles.cardTitle}>Phone notifications</Text>
      <Text style={onDark ? styles.landingBody : styles.cardBody}>
        Tap once after the app is installed. The phone will ask you to allow alerts.
      </Text>
      <Pressable
        onPress={() => void allow()}
        style={onDark ? styles.landingButton : styles.cardButton}
        accessibilityRole="button"
        accessibilityLabel="Allow notifications"
      >
        <Text style={styles.buttonText}>Allow notifications</Text>
      </Pressable>
      {status ? <Text style={onDark ? styles.landingBody : styles.cardBody}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  cardTitle: { color: LETTERING_ON_WHITE, fontSize: 16, fontWeight: "800" },
  cardBody: { color: LETTERING_ON_WHITE, fontSize: 14, lineHeight: 20 },
  cardButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    ...webPointer,
  },
  landing: { gap: 8, marginTop: 8 },
  landingTitle: { color: T.gold, fontSize: 16, fontWeight: "800", textAlign: "center" },
  landingBody: { color: T.gold, fontSize: 14, lineHeight: 20, textAlign: "center" },
  landingButton: {
    backgroundColor: T.electric,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    ...webPointer,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
