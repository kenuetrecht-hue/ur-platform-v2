import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePlatformOwner } from "@/lib/use-platform-owner";

/** Website and app entry: owner/staff go to Administration; everyone else to Home or the public landing. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccessAdminDashboard, isLoading: ownerLoading } = usePlatformOwner();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  if (!clientReady || isLoading || (isAuthenticated && ownerLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (canAccessAdminDashboard) {
      return <Redirect href="/(tabs)/admin" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
