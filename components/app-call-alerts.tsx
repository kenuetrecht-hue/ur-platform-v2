import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

const CALL_CHANNEL = "ur-incoming-call";
const ROOM_ID = /^[a-zA-Z0-9-]{1,80}$/;

function projectId(): string {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? "";
}

function roomFromNotification(data: Record<string, unknown> | undefined): string {
  const roomId = data?.roomId;
  return typeof roomId === "string" && ROOM_ID.test(roomId) ? roomId : "";
}

/** Installed UR app: high-priority Answer card, ready for the store build. */
export function AppCallAlerts() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const register = trpc.social.registerAppCallRing.useMutation();
  const registerRef = useRef(register.mutate);
  registerRef.current = register.mutate;

  useEffect(() => {
    if (Platform.OS === "web" || !isAuthenticated) return;
    let remove = () => {};
    let cancelled = false;

    void (async () => {
      const Notifications = await import("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(CALL_CHANNEL, {
          name: "Incoming video calls",
          importance: Notifications.AndroidImportance.MAX,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 400, 200, 400, 200, 800],
          enableVibrate: true,
          sound: "default",
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          },
        });
      }
      await Notifications.setNotificationCategoryAsync("incomingCall", [
        { identifier: "answer", buttonTitle: "Answer", options: { opensAppToForeground: true } },
        {
          identifier: "decline",
          buttonTitle: "Decline",
          options: { opensAppToForeground: true, isDestructive: true },
        },
      ]);
      const permission = await Notifications.getPermissionsAsync();
      const granted =
        permission.granted ||
        (await Notifications.requestPermissionsAsync()).granted;
      const id = projectId();
      if (granted && id && !cancelled) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({ projectId: id });
          if (token.data.startsWith("ExponentPushToken[")) registerRef.current({ token: token.data });
        } catch {
          /* Store push credentials are added when the app is listed. */
        }
      }
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const roomId = roomFromNotification(response.notification.request.content.data);
        if (!roomId) return;
        const decline = response.actionIdentifier === "decline";
        router.push(decline ? `/call/${roomId}?decline=1` : `/call/${roomId}?pickUp=1`);
      });
      remove = () => subscription.remove();
    })();

    return () => {
      cancelled = true;
      remove();
    };
  }, [isAuthenticated, router]);

  return null;
}
