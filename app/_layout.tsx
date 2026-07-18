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
import { OnboardingProvider } from "@/lib/onboarding-context";

// Temporary fix for displayName error
import 'react-native-safe-area-context/src/SafeAreaContext';

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
    <AuthProvider>
      <OnboardingProvider>
        <ThemeProvider>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  >
                    {/* The (tabs) group will handle its own navigation and screens */}
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  </Stack>
                  <StatusBar style="auto" />
                </QueryClientProvider>
              </trpc.Provider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </ThemeProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
