import { Alert, Platform } from "react-native";

/** User-facing message — Alert on native; visible fallback on web where Alert.alert is a no-op. */
export function showUserMessage(title: string, message: string): void {
  const body = message.trim() ? `${title}\n\n${message}` : title;
  if (Platform.OS === "web") {
    if (typeof globalThis.alert === "function") {
      globalThis.alert(body);
    }
    return;
  }
  Alert.alert(title, message);
}
