import { useAuth } from "@/lib/auth-context";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Redirects users based on auth state:
 * - Unauthenticated users cannot access (tabs)
 * - Authenticated users are kept out of the login screen
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthRoute =
      segments[0] === "(auth)" ||
      (segments.length === 1 && segments[0] === "login");
    const inProtectedRoute = segments[0] === "(tabs)";

    if (!isAuthenticated && inProtectedRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && inAuthRoute) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
