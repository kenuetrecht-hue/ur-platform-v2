import { useAuth } from "@/lib/auth-context";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { trpc } from "@/lib/trpc";

function isAuthRoute(segments: string[]): boolean {
  const root = segments[0];
  return root === "(auth)" || root === "login" || root === "signup";
}

function isPublicMarketing(segments: string[]): boolean {
  const root = segments[0];
  return root === "welcome" || root === "handoff" || root === "link" || root === undefined;
}

function isAgeVerifyRoute(segments: string[]): boolean {
  return segments[0] === "age-verify";
}

function isPublicRoute(segments: string[]): boolean {
  return isAuthRoute(segments) || isPublicMarketing(segments) || isAgeVerifyRoute(segments);
}

/**
 * Redirects users based on auth + 18+ KYC:
 * - Unauthenticated users cannot access the product
 * - Authenticated users cannot enter until ID front/back + selfie pass
 */
export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [clientReady, setClientReady] = useState(false);

  const kycQuery = trpc.ageKyc.getStatus.useQuery(undefined, {
    enabled: clientReady && isAuthenticated,
    retry: 1,
    staleTime: 15_000,
  });

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady || (isLoading && !isAuthenticated)) return;

    const inAuthRoute = isAuthRoute(segments);
    const inPublicMarketing = isPublicMarketing(segments);
    const inAgeVerify = isAgeVerifyRoute(segments);
    const inProtectedRoute =
      segments[0] === "(tabs)" ||
      segments[0] === "profile" ||
      segments[0] === "jobsite" ||
      segments[0] === "owner-ops" ||
      segments[0] === "3d-workspace" ||
      segments[0] === "playroom";

    if (!isAuthenticated && (inProtectedRoute || inAgeVerify)) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && inAuthRoute) {
      router.replace("/age-verify");
      return;
    }

    const kycVerified = kycQuery.data?.verified === true;
    const kycReady = !kycQuery.isLoading;

    if (isAuthenticated && kycReady && !kycVerified && !inAgeVerify) {
      router.replace("/age-verify");
      return;
    }

    if (isAuthenticated && kycVerified && inAgeVerify) {
      router.replace("/(tabs)");
      return;
    }

    if (isAuthenticated && kycVerified && inPublicMarketing) {
      router.replace("/(tabs)");
    }
  }, [
    clientReady,
    isAuthenticated,
    isLoading,
    segments,
    router,
    kycQuery.data?.verified,
    kycQuery.isLoading,
  ]);

  if (clientReady && isLoading && !isPublicRoute(segments)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (clientReady && isAuthenticated && kycQuery.isLoading && !isAgeVerifyRoute(segments)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
