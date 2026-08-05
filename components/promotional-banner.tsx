import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BrandGradient } from "@/components/brand-gradient";
import { withAlpha } from "@/lib/brand-theme";
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

export function PromotionalBanner({
  creatorCounts = { tier1: 0, tier2: 0, tier3: 0 },
  onLearnMore,
  fullSize = false,
}: PromotionalBannerProps) {
  const [state, setState] = useState<PromotionalState>(() => initializePromotionalSystem());

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => updatePromotionalState(prev, creatorCounts));
    }, 1000);
    return () => clearInterval(interval);
  }, [creatorCounts]);

  if (!state.isActive) return null;

  const tier1 = state.tiers[0];
  const tier1Remaining = tier1.capacity - tier1.joined;
  const progress = Math.min(100, (tier1.joined / tier1.capacity) * 100);

  if (fullSize) {
    return (
      <BrandGradient variant="brand" style={styles.full}>
        <Text style={styles.fullTitle}>30-day launch</Text>
        <Text style={styles.fullSubtitle}>
          {tier1Remaining} Tier 1 spots left · {state.daysRemaining}d {state.hoursRemaining}h
          remaining
        </Text>

        <View style={[styles.countdownCard, { backgroundColor: withAlpha("#FFFFFF", 0.12) }]}>
          <Text style={styles.countdownLabel}>Promotion ends in</Text>
          <View style={styles.countdownRow}>
            <CountdownUnit value={state.daysRemaining} label="days" />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={state.hoursRemaining} label="hrs" padded />
            <Text style={styles.countdownSep}>:</Text>
            <CountdownUnit value={state.minutesRemaining || 0} label="min" padded />
          </View>
        </View>

        <View style={[styles.tierCard, { backgroundColor: withAlpha("#FFFFFF", 0.1) }]}>
          <Text style={styles.tierTitle}>Tier 1 · Founding creators</Text>
          <Text style={styles.tierBody}>
            {tier1.joined} / 100 joined · {tier1Remaining} spots left
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: withAlpha("#FFFFFF", 0.2) }]}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.tierBenefits}>
            92.5% earnings for 180 days · 100% first 24 hours · weekly lifetime ticket
          </Text>
        </View>

        <View style={styles.tierRow}>
          <MiniTier label="Tier 2" detail="94% for 90 days" />
          <MiniTier label="Tier 3" detail="92.5% for 30 days" />
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            onLearnMore?.();
          }}
          style={[styles.cta, { backgroundColor: withAlpha("#FFFFFF", 0.22) }]}
        >
          <Text style={styles.ctaText}>Join Tier 1</Text>
        </Pressable>
      </BrandGradient>
    );
  }

  return (
    <BrandGradient variant="brand" style={styles.compact}>
      <Text style={styles.compactTitle}>
        Launch · {tier1Remaining} Tier 1 spots · {state.daysRemaining}d {state.hoursRemaining}h left
      </Text>
      <Text style={styles.compactSub}>92.5% earnings + weekly lifetime ticket (Tier 1)</Text>
    </BrandGradient>
  );
}

function CountdownUnit({
  value,
  label,
  padded,
}: {
  value: number;
  label: string;
  padded?: boolean;
}) {
  const display = padded ? String(value).padStart(2, "0") : value;
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownValue}>{display}</Text>
      <Text style={styles.countdownUnitLabel}>{label}</Text>
    </View>
  );
}

function MiniTier({ label, detail }: { label: string; detail: string }) {
  return (
    <View style={[styles.miniTier, { backgroundColor: withAlpha("#FFFFFF", 0.1) }]}>
      <Text style={styles.miniTierLabel}>{label}</Text>
      <Text style={styles.miniTierDetail}>{detail}</Text>
    </View>
  );
}

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

  if (!state.isActive) return null;

  const tier1 = state.tiers[0];
  const tier1Remaining = tier1.capacity - tier1.joined;

  return (
    <BrandGradient variant="brand" style={styles.compact}>
      <Text style={styles.compactTitle}>
        {tier1Remaining} Tier 1 spots · {state.daysRemaining}d {state.hoursRemaining}h
      </Text>
    </BrandGradient>
  );
}

const styles = StyleSheet.create({
  full: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
  },
  fullTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  fullSubtitle: {
    color: withAlpha("#FFFFFF", 0.9),
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  countdownCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  countdownLabel: {
    color: withAlpha("#FFFFFF", 0.85),
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  countdownUnit: {
    alignItems: "center",
    minWidth: 52,
  },
  countdownValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  countdownUnitLabel: {
    color: withAlpha("#FFFFFF", 0.8),
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  countdownSep: {
    color: withAlpha("#FFFFFF", 0.6),
    fontSize: 24,
    fontWeight: "700",
    marginTop: -8,
  },
  tierCard: {
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  tierTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  tierBody: {
    color: withAlpha("#FFFFFF", 0.88),
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: withAlpha("#FFFFFF", 0.75),
    borderRadius: 3,
  },
  tierBenefits: {
    color: withAlpha("#FFFFFF", 0.82),
    fontSize: 11,
    lineHeight: 16,
  },
  tierRow: {
    flexDirection: "row",
    gap: 10,
  },
  miniTier: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  miniTierLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  miniTierDetail: {
    color: withAlpha("#FFFFFF", 0.85),
    fontSize: 10,
  },
  cta: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  compact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  compactTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  compactSub: {
    color: withAlpha("#FFFFFF", 0.88),
    fontSize: 10,
    textAlign: "center",
  },
});
