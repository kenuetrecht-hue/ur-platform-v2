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

// ============================================================================
// 👑🎙️ MASTER ARCHITECTURE FOR 20+ DISTINCT AI PERSONALITIES
// ============================================================================
export interface ICreatorAiIdentity {
  agentId: string;
  displayName: string;
  avatarImageUrl: string;
  elevenLabsVoiceId: string;
  vocalStyleTone: string;
  industrySector: "real-estate" | "trades" | "engineering" | "compliance" | "operations" | "media";
}

// Master corporate registry tracking all initial cores, structured to scale to 20+ seamlessly
export const SYSTEM_CREATOR_REGISTRY: Record<string, ICreatorAiIdentity> = {
  REAL_ESTATE_MASTER: {
    agentId: "REAL_ESTATE_MASTER",
    displayName: "Acquisitions & House Flip Specialist",
    avatarImageUrl: "https://assets.urmedia.io/avatars/real-estate-pro.png",
    elevenLabsVoiceId: "voice_model_corporate_acquisitions_01",
    vocalStyleTone: "Confident, analytical, articulation-focused, corporate",
    industrySector: "real-estate",
  },
  PLUMBING_FOREMAN: {
    agentId: "PLUMBING_FOREMAN",
    displayName: "Master Plumber Vance",
    avatarImageUrl: "https://assets.urmedia.io/avatars/foreman-vance.png",
    elevenLabsVoiceId: "voice_model_seasoned_tradesman_05",
    vocalStyleTone: "Direct, gritty, authoritative blue-collar accent",
    industrySector: "trades",
  },
  PHYSICS_ENGINEER: {
    agentId: "PHYSICS_ENGINEER",
    displayName: "Structural Physics & Aerodynamics Judge",
    avatarImageUrl: "https://assets.urmedia.io/avatars/structural-judge.png",
    elevenLabsVoiceId: "voice_model_academic_precise_09",
    vocalStyleTone: "Deep, calculated, precise, measured cadence",
    industrySector: "engineering",
  },
  COMPLIANCE_DOCTOR: {
    agentId: "COMPLIANCE_DOCTOR",
    displayName: "Compliance Doctor & Legal Counsel",
    avatarImageUrl: "https://assets.urmedia.io/avatars/compliance-doctor.png",
    elevenLabsVoiceId: "voice_model_regulatory_counsel_02",
    vocalStyleTone: "Calm, objective, reassuring, clear standard legal tone",
    industrySector: "compliance",
  },
  // 🚀 Slots 5 through 20 mount directly here dynamically via DB syncing or a static constants file!
};

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

/**
 * Wrapper component for onboarding screen to handle hook properly
 */
function OnboardingScreenWrapper() {
  const { completeOnboarding } = useOnboarding();

  return (
    <UserOnboardingScreen
      onComplete={async (agreement) => {
        await completeOnboarding(agreement);
      }}
    />
  );
}

function RootLayoutContent() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const { hasCompletedOnboarding, isLoading } = useOnboarding();

  // Initialize Manus runtime for cookie injection
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

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

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  // The Navigation Core of UR App — UPGRADED FOR 20-IDENTITY SCALING WORKPLACES
  const appNavigationStack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="signup" />
      <Stack.Screen name="login" />
      
      {/* 👑 VOICE EMPIRE CORE WORKSPACE HOOKS */}
      <Stack.Screen name="viewport-3d-satmap" />       {/* Voice-Controlled 3D Satellite Map */}
      <Stack.Screen name="real-estate-acquisitions" /> {/* ARV/MAO Flip & Investment Agent Portal */}
      <Stack.Screen name="field-logistics-hub" />       {/* Tool Checklists & Asset Logistics Tracker */}
      <Stack.Screen name="admin-compliance-doctor" />  {/* Legal, IRS Tax & Automated Patch Terminal */}
      
      <Stack.Screen name="verify-age" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="creator/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="tip/[id]" />
      <Stack.Screen name="join-chat/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="loyalty" />
      <Stack.Screen name="creator-dashboard" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-financial" />
      <Stack.Screen name="admin-affiliate" />
      <Stack.Screen name="admin-moderation" />
      <Stack.Screen name="admin-social-security" />
      <Stack.Screen name="contests" />
      <Stack.Screen name="giveaways" />
      <Stack.Screen name="real-merchant" />
      <Stack.Screen name="oauth/callback" />
    </Stack>
  );

  const isWeb = Platform.OS === "web";

  // Show onboarding screen if not completed and not loading
  if (!isLoading && !hasCompletedOnboarding) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <trpc.Provider client={trpcClient} queryClient={queryClient}>
                  <QueryClientProvider client={queryClient}>
                    <OnboardingScreenWrapper />
                    <StatusBar style="auto" />
                  </QueryClientProvider>
                </trpc.Provider>
              </GestureHandlerRootView>
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  // Show loading screen while checking onboarding status
  if (isLoading) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <View className="flex-1 items-center justify-center bg-background">
            <Text className="text-foreground">Loading...</Text>
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  // 1. WEB BROWSER MODE STRUCTURAL RENDER
  if (isWeb) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <trpc.Provider client={trpcClient} queryClient={queryClient}>
                  <QueryClientProvider client={queryClient}>
                    
                    {/* Main Web Page Parent Wrapper */}
                    <View className="min-h-screen w-full bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white overflow-y-auto">
                      
                      {/* Promotional Banner - 30-Day Launch Celebration */}
                      <View className="flex-shrink-0">
                        <PromotionalBanner creatorCounts={{ tier1: 0, tier2: 0, tier3: 0 }} />
                      </View>

                      {/* Global Sticky Disclosure Banner - Enhanced for Immersive Scaled Personalities */}
                      <View className="w-full bg-yellow-400 border-b border-indigo-600 px-4 py-3 sticky top-0 z-50 shadow-sm">
                        <Text className="text-xs text-gray-950 font-bold tracking-wide text-center leading-relaxed max-w-5xl mx-auto">
                          🤖 Notice: Direct interaction with custom synthetic AI personas possessing unique visual identities and cloned ElevenLabs vocal models. Interactions may yield affiliate commissions to UR LLC. Provided for educational, recreational, and industrial system validations.
                        </Text>
                      </View>

                      {/* Desktop Layout Container */}
                      <View className="flex-1 w-full max-w-7xl mx-auto bg-white shadow-xl border-x border-gray-100 flex flex-col md:my-4 md:rounded-xl overflow-hidden">
                        <View className="flex-1">
                          {appNavigationStack}
                        </View>
                      </View>

                    </View>
                    <StatusBar style="auto" />
                  </QueryClientProvider>
                </trpc.Provider>
              </GestureHandlerRootView>
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  // 2. MOBILE APP NATIVE MODE RENDER (iOS & Android)
  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              
              {/* Native App View Container */}
              <View className="flex-1 bg-black">
                {/* Promotional Banner - 30-Day Launch Celebration (Compact for Mobile) */}
                <PromotionalBannerCompact creatorCounts={{ tier1: 0, tier2: 0, tier3: 0 }} />

                {/* Clean, integrated native disclosure banner with specific voice notice */}
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
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <RootLayoutContent />
    </OnboardingProvider>
  );
}
