import { useAuth } from "@/lib/auth-context";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

function isPublicRoute(segments: string[]): boolean {
  const root = segments[0];
  return (
    root === "(auth)" ||
    root === "login" ||
    root === "signup" ||
    root === "welcome" ||
    root === "handoff" ||
    root === "link" ||
    root === undefined
  );
}

/**
 * Redirects users based on auth state:
 * - Unauthenticated users cannot access (tabs)
 * - Authenticated users are kept out of the login screen
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady || isLoading) return;

    const inAuthRoute =
      segments[0] === "(auth)" ||
      segments[0] === "login" ||
      segments[0] === "signup";
    const inPublicMarketing =
      segments[0] === "welcome" || segments[0] === "handoff" || segments[0] === "link";
    const inProtectedRoute = segments[0] === "(tabs)" || segments[0] === "profile";

    if (!isAuthenticated && inProtectedRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && inAuthRoute) {
      router.replace("/(tabs)");
      return;
    }

    if (isAuthenticated && inPublicMarketing) {
      router.replace("/(tabs)");
    }
  }, [clientReady, isAuthenticated, isLoading, segments, router]);

  // Public pages (welcome, login, etc.) render immediately — don't block on Supabase session restore.
  if (clientReady && isLoading && !isPublicRoute(segments)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
