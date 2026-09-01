import { Platform } from "react-native";
import { OWNER_EMERGENCY_CHANNEL_ID, OWNER_EMERGENCY_CHANNEL_NAME } from "./owner-emergency";

export async function armOwnerPhoneAlarm(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    return null;
  }

  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(OWNER_EMERGENCY_CHANNEL_ID, {
        name: OWNER_EMERGENCY_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 200, 600, 200, 600],
        enableVibrate: true,
        sound: "default",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data ?? null;
  } catch {
    return null;
  }
}

/** Local phone ping — works at sign-in even if Expo cloud push is not set up yet. */
export async function presentLocalEmergencySignal(title: string, body: string): Promise<void> {
  if (Platform.OS === "web") {
    showWebEmergencyNotice(title, body);
    return;
  }
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { route: "/owner-ops", kind: "owner_emergency" },
      },
      trigger: null,
    });
  } catch {
    /* in-app banner / modal still show */
  }
}

export function showWebEmergencyNotice(title: string, body: string): void {
  if (Platform.OS !== "web" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, requireInteraction: true });
  } catch {
    /* browsers may block */
  }
}
