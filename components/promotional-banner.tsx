import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  PromotionalState,
  updatePromotionalState,
  initializePromotionalSystem,
} from "@/lib/promotional-banner-system";
import * as Haptics from "expo-haptics";

interface PromotionalBannerProps {
  creatorCounts?: { tier1: number; tier2: number; tier3: number };
  onLearnMore?: () => void;
  fullSize?: boolean;
}

/**
 * LARGE, PROMINENT promotional banner - READABLE on every page
 */
export function PromotionalBanner({
  creatorCounts = { tier1: 0, tier2: 0, tier3: 0 },
  onLearnMore,
  fullSize = false,
}: PromotionalBannerProps) {
  const colors = useColors();
  const [state, setState] = useState<PromotionalState>(() => initializePromotionalSystem());

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => updatePromotionalState(prev, creatorCounts));
    }, 1000);

    return () => clearInterval(interval);
  }, [creatorCounts]);

  if (!state.isActive) {
    return null;
  }

  const tier1 = state.tiers[0];
  const tier1Remaining = tier1.capacity - tier1.joined;

  // FULL SIZE BANNER - LARGE AND PROMINENT
  if (fullSize) {
    return (
      <View className="bg-gradient-to-b from-red-600 via-red-700 to-red-900 px-4 py-6 border-b-4 border-yellow-400 gap-4">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-black text-white text-center">
            🎉 30-DAY LAUNCH 🎉
          </Text>
          <Text className="text-xl font-bold text-yellow-300 text-center">
            🔥 HURRY! HURRY! HURRY! 🔥
          </Text>
        </View>

        {/* COUNTDOWN TIMER - LARGE */}
        <View className="bg-black/30 rounded-2xl p-5 border-2 border-yellow-300 gap-2">
          <Text className="text-base font-bold text-yellow-300 text-center">
            ⏰ PROMOTION ENDS IN:
          </Text>
          <View className="flex-row justify-center gap-4">
            <View className="items-center">
              <Text className="text-5xl font-black text-white">
                {state.daysRemaining}
              </Text>
              <Text className="text-sm font-bold text-yellow-300">DAYS</Text>
            </View>
            <Text className="text-4xl font-black text-white mt-1">:</Text>
            <View className="items-center">
              <Text className="text-5xl font-black text-white">
                {String(state.hoursRemaining).padStart(2, "0")}
              </Text>
              <Text className="text-sm font-bold text-yellow-300">HOURS</Text>
            </View>
            <Text className="text-4xl font-black text-white mt-1">:</Text>
            <View className="items-center">
              <Text className="text-5xl font-black text-white">
                {String(state.minutesRemaining || 0).padStart(2, "0")}
              </Text>
              <Text className="text-sm font-bold text-yellow-300">MINS</Text>
            </View>
          </View>
        </View>

        {/* TIER 1 SPOTLIGHT */}
        <View className="bg-yellow-400/20 rounded-xl p-4 border-2 border-yellow-400 gap-3">
          <View className="flex-row items-center gap-2">
            <Text className="text-3xl">🥇</Text>
            <View className="flex-1">
              <Text className="text-xl font-black text-white">
                TIER 1: FOUNDING CREATORS
              </Text>
              <Text className="text-xs font-bold text-yellow-200 mt-1">
                First 100 Only - Exclusive Lifetime Benefits!
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View className="gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-bold text-white">
                ✅ {tier1.joined} / 100 Joined
              </Text>
              <Text className="text-base font-bold text-red-300">
                🚀 {tier1Remaining} SPOTS LEFT!
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-black/30 rounded-full overflow-hidden border border-yellow-400">
              <View
                className="h-full bg-yellow-400"
                style={{ width: `${(tier1.joined / 100) * 100}%` }}
              />
            </View>
          </View>

          {/* Benefits */}
          <View className="gap-2 mt-2">
            <Text className="text-sm font-bold text-white">✨ EXCLUSIVE BENEFITS:</Text>
            <Text className="text-xs font-semibold text-yellow-200 leading-relaxed">
              💰 92.5% Earnings for 180 Days{"\n"}
              ⏰ 100% Earnings First 24 Hours{"\n"}
              🎫 1 FREE TICKET EACH WEEK FOR LIFE{"\n"}
              🎁 Monthly Drawing: 24-Hour 100% Prize
            </Text>
          </View>
        </View>

        {/* OTHER TIERS */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-purple-500/20 rounded-lg p-3 border border-purple-400">
            <Text className="text-sm font-bold text-white">🥈 TIER 2</Text>
            <Text className="text-xs font-semibold text-purple-200 mt-1">94% for 90 days</Text>
          </View>
          <View className="flex-1 bg-purple-600/20 rounded-lg p-3 border border-purple-500">
            <Text className="text-sm font-bold text-white">🥉 TIER 3</Text>
            <Text className="text-xs font-semibold text-purple-200 mt-1">92.5% for 30 days</Text>
          </View>
        </View>

        {/* CTA BUTTON */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onLearnMore?.();
          }}
          className="bg-yellow-400 rounded-xl py-4 px-4 active:opacity-80"
        >
          <Text className="text-lg font-black text-red-900 text-center">
            🚀 JOIN TIER 1 NOW - LIMITED SPOTS! 🚀
          </Text>
        </Pressable>

        {/* Bottom Message */}
        <Text className="text-sm font-bold text-yellow-200 text-center">
          ⚡ LIMITED TIME! EXCLUSIVE BENEFITS ONLY FOR FIRST 100! ⚡
        </Text>
      </View>
    );
  }

  // COMPACT BANNER - for sticky header on all pages
  return (
    <View className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-600 px-4 py-3 border-b-2 border-red-700 flex-shrink-0 gap-2">
      {/* Line 1: Main message */}
      <Text className="text-base font-black text-white text-center">
        🎉 30-DAY LAUNCH: {tier1Remaining} TIER 1 SPOTS LEFT! 🎉
      </Text>

      {/* Line 2: Countdown + Urgency */}
      <View className="flex-row items-center justify-center gap-2">
        <Text className="text-sm font-bold text-red-900">
          ⏰ {state.daysRemaining}d {state.hoursRemaining}h
        </Text>
        <Text className="text-base font-black text-red-900">|</Text>
        <Text className="text-sm font-black text-red-900">
          🔥 HURRY! HURRY! HURRY! 🔥
        </Text>
      </View>

      {/* Line 3: Benefits teaser */}
      <Text className="text-xs font-bold text-red-900 text-center">
        ✨ 92.5% Earnings + 1 FREE TICKET/WEEK FOR LIFE (Tier 1 Only)
      </Text>
    </View>
  );
}

/**
 * Compact version for mobile
 */
export function PromotionalBannerCompact({
  creatorCounts = { tier1: 0, tier2: 0, tier3: 0 },
}: PromotionalBannerProps) {
  const [state, setState] = useState<PromotionalState>(() => initializePromotionalSystem());

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => updatePromotionalState(prev, creatorCounts));
    }, 1000);

    return () => clearInterval(interval);
  }, [creatorCounts]);

  if (!state.isActive) {
    return null;
  }

  const tier1 = state.tiers[0];
  const tier1Remaining = tier1.capacity - tier1.joined;

  return (
    <View className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-600 px-3 py-2 border-b-2 border-red-700 flex-shrink-0">
      <Text className="text-xs font-black text-white text-center">
        🎉 {tier1Remaining} TIER 1 SPOTS | ⏰ {state.daysRemaining}d {state.hoursRemaining}h | 🔥 HURRY! 🔥
      </Text>
      <Text className="text-xs font-bold text-red-900 text-center mt-1">
        ✨ 92.5% Earnings + 1 FREE TICKET/WEEK FOR LIFE
      </Text>
    </View>
  );
}
