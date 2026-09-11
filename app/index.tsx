import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AFTER_SIGN_IN_HREF } from "@/lib/after-sign-in";

/** Website and app entry: signed-in people go to the ID photo page first. */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  if (!clientReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={AFTER_SIGN_IN_HREF} />;
  }

  return <Redirect href="/welcome" />;
}
