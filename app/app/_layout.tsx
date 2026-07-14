import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, View, Text } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { UserOnboardingScreen } from "@/app/user-onboarding-screen";
import { PromotionalBanner, PromotionalBannerCompact } from "@/components/promotional-banner";
import LoginScreen from "@/app/login";

export interface ICreatorAiIdentity {
  agentId: string;
  displayName: string;
  avatarImageUrl: string;
  elevenLabsVoiceId: string;
  vocalStyleTone: string;
  industrySector: "real-estate" | "trades" | "engineering" | "compliance" | "operations" | "media";
}

const queryClient = new QueryClient();
const trpcClient = createTRPCClient();

function AuthGatedRootLayoutContent() {
  const { isLoading, isLoggedIn } = useAuth();
  const { isOnboarded } = useOnboarding();
  const [frameContext, setFrameContext] = useState<Metrics | null>(null);
  const [insets, setInsets] = useState<EdgeInsets | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSafeAreaInsets((newInsets) => {
      setInsets(newInsets);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const initRuntime = async () => {
      await initManusRuntime();
    };
    initRuntime();
  }, []);

  const providerInitialMetrics = useMemo(() => {
    if (frameContext && insets) {
      return { frame: frameContext, insets };
    }
    return initialWindowMetrics;
  }, [frameContext, insets]);

  if (isLoading) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center bg-background">
            <Text className="text-foreground">Loading...</Text>
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <LoginScreen />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  if (!isOnboarded) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <UserOnboardingScreen />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  const appNavigationStack = (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );

  return (
    <SafeAreaProvider initialMetrics={providerInitialMetrics}>
      <SafeAreaFrameContext.Provider value={frameContext}>
        <SafeAreaInsetsContext.Provider value={insets}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
              <QueryClientProvider client={queryClient}>
                <View className="flex-1 bg-black">
                  <PromotionalBannerCompact creatorCounts={{ tier1: 0, tier2: 0, tier3: 0 }} />
                  <View className="bg-yellow-400 px-3 py-2">
                    <Text className="text-[10px] text-gray-900 font-semibold text-center leading-tight">
                      🤖 Voice & visual network active with custom synthetic AI personas. Educational/operational focus only.
                    </Text>
                  </View>
                  {appNavigationStack}
                </View>
                <StatusBar style="auto" />
              </QueryClientProvider>
            </trpc.Provider>
          </GestureHandlerRootView>
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <ThemeProvider>
          <AuthGatedRootLayoutContent />
      </ThemeProvider>
    </OnboardingProvider>
}
