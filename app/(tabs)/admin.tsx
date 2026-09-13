import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import OwnerOpsScreen from "../owner-ops";
import { usePlatformOwner } from "@/lib/use-platform-owner";

/** Administration Dashboard in the tab bar — owner and authorized staff only. */
export default function AdminTabScreen() {
  const { canAccessAdminDashboard, isLoading } = usePlatformOwner();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!canAccessAdminDashboard) {
    return <Redirect href="/(tabs)/index" />;
  }

  return <OwnerOpsScreen />;
}
