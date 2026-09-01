import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

/** Same entry on website and native app: homepage first, ID check after sign-in. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  if (!clientReady || isLoading) {
    if (isAuthenticated) {
      return <Redirect href="/(tabs)" />;
    }
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
