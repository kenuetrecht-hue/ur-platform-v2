import { Redirect } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  // Web: send visitors to the landing page immediately (auth restores in the background).
  if (Platform.OS === "web") {
    if (!isLoading && isAuthenticated) {
      return <Redirect href="/(tabs)" />;
    }
    return <Redirect href="/welcome" />;
  }

  if (clientReady && isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!clientReady) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
