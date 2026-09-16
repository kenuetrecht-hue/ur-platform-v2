import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import OwnerOpsScreen from "../owner-ops";
import { usePlatformOwner } from "@/lib/use-platform-owner";

/** Administration Dashboard — platform owner only, opened from Home. */
export default function AdminTabScreen() {
  const { isPlatformOwner, isLoading } = usePlatformOwner();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isPlatformOwner) {
    return <Redirect href="/home" />;
  }

  return <OwnerOpsScreen />;
}
