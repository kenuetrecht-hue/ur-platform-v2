import { Stack } from "expo-router";

/** Bottom legal disclaimer is rendered by PlatformDisclosureFrame for non-tab routes. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
