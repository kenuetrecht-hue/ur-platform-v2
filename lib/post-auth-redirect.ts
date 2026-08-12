import { Platform } from "react-native";
import type { Href } from "expo-router";

/** Where to send users after sign-out — homepage on web, login on native. */
export function getPostLogoutHref(): Href {
  return Platform.OS === "web" ? "/welcome" : "/login";
}
