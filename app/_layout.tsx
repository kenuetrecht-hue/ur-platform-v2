import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
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

import "react-native-safe-area-context/src/SafeAreaContext";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
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

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AuthRouteGuard>
                  <Stack screenOptions={{ headerShown: false }} />
                </AuthRouteGuard>
              </AuthProvider>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </trpc.Provider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
