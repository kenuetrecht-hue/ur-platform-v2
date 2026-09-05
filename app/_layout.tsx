import "@/global.css";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { AuthProvider } from "@/lib/auth-context";
import { AuthRouteGuard } from "@/components/auth-route-guard";
import { LandingDemoConversionTracker } from "@/components/landing-demo-conversion-tracker";
import { PlatformDisclosureFrame } from "@/components/platform-disclosure-frame";
import { OwnerEmergencyAlarm } from "@/components/owner-emergency-alarm";
import { useRegisterPwaServiceWorker } from "@/hooks/use-register-pwa-service-worker";

import "react-native-safe-area-context/src/SafeAreaContext";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  useRegisterPwaServiceWorker();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const RootShell = Platform.OS === "web" ? View : GestureHandlerRootView;

  return (
    <ThemeProvider>
      <Head>
        <title>UR Platform — AI specialists, creators, and 3D workspace</title>
        <meta
          name="description"
          content="Install UR from this website — no App Store or Google Play required."
        />
        <meta name="theme-color" content="#07080d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="UR" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <RootShell style={{ flex: 1 }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <LandingDemoConversionTracker />
                <AuthRouteGuard>
                  <PlatformDisclosureFrame>
                    <OwnerEmergencyAlarm />
                    <Stack screenOptions={{ headerShown: false }} />
                  </PlatformDisclosureFrame>
                </AuthRouteGuard>
              </AuthProvider>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </trpc.Provider>
        </RootShell>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
