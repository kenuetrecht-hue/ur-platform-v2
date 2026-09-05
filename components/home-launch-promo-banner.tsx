import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BrandGradient } from "@/components/brand-gradient";
import {
  initializePromotionalSystem,
  updatePromotionalState,
} from "@/lib/promotional-banner-system";
import {
  LAUNCH_PROMOTION_HEADLINE,
  LAUNCH_PROMOTION_TIERS,
  LAUNCH_SIGNUP_WINDOW_DAYS,
  PLATFORM_FEE_PERCENT,
} from "@/lib/launch-promotion-config";
import { FOUNDING_AUDIENCE_YEAR_RULE_SHORT } from "@/lib/founding-audience-year-discount";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function CountdownUnit({ value, label, padded }: { value: number; label: string; padded?: boolean }) {
  const display = padded ? String(value).padStart(2, "0") : value;
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownValue}>{display}</Text>
      <Text style={styles.countdownUnitLabel}>{label}</Text>
    </View>
  );
}

export function HomeLaunchPromoBanner() {
  const colors = useColors();
  const router = useRouter();
  const stats = trpc.stamps.getPromotionStats.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: 1,
  });

  const creatorCounts = useMemo(
    () => ({
      tier1: stats.data?.tier1?.joined ?? 0,
      tier2: stats.data?.tier2?.joined ?? 0,
      tier3: stats.data?.tier3?.joined ?? 0,
    }),
    [stats.data],
  );

  const [promoState, setPromoState] = useState(() => initializePromotionalSystem());

  useEffect(() => {
    const tick = () => {
      setPromoState((prev) => updatePromotionalState(prev, creatorCounts));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [creatorCounts]);

  const totalRemaining = stats.data?.totalRemaining ?? promoState.totalSpotsRemaining;
  const isActive = stats.data?.isActive ?? promoState.isActive;

  if (!isActive) {
    return (
      <View style={[styles.inactiveWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.inactiveTitle, { color: colors.foreground }]}>
          Launch window closed
        </Text>
        <Text style={[styles.inactiveSub, { color: colors.muted }]}>
          The {LAUNCH_SIGNUP_WINDOW_DAYS}-day creator tier promotion has ended. Share UR Platform
          from your affiliate dashboard to keep earning referrals.
        </Text>
        <Pressable
          onPress={() => router.push("/affiliate-dashboard")}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.ctaText}>Open Affiliate Dashboard →</Text>
        </Pressable>
      </View>
    );
  }

  const activeTier =
    creatorCounts.tier1 < 100
      ? LAUNCH_PROMOTION_TIERS[0]
      : creatorCounts.tier2 < 100
        ? LAUNCH_PROMOTION_TIERS[1]
        : LAUNCH_PROMOTION_TIERS[2];

  const activeTierRemaining =
    creatorCounts.tier1 < 100
      ? 100 - creatorCounts.tier1
      : creatorCounts.tier2 < 100
        ? 100 - creatorCounts.tier2
        : 100 - creatorCounts.tier3;

  return (
    <BrandGradient variant="brand" style={styles.wrap}>
      <Text style={styles.tag}>
        {LAUNCH_SIGNUP_WINDOW_DAYS}-DAY LAUNCH · {totalRemaining} SPOTS LEFT
      </Text>
      <Text style={styles.headline}>{LAUNCH_PROMOTION_HEADLINE}</Text>
      <Text style={styles.sub}>
        First 300 creators lock tier discounts on the {PLATFORM_FEE_PERCENT}% platform fee. No coupon
        — signup order is your code. {FOUNDING_AUDIENCE_YEAR_RULE_SHORT}
      </Text>

      <View style={styles.countdownCard}>
        <Text style={styles.countdownLabel}>Contest ends in</Text>
        <View style={styles.countdownRow}>
          <CountdownUnit value={promoState.daysRemaining} label="days" />
          <Text style={styles.countdownSep}>:</Text>
          <CountdownUnit value={promoState.hoursRemaining} label="hrs" padded />
          <Text style={styles.countdownSep}>:</Text>
          <CountdownUnit value={promoState.minutesRemaining} label="min" padded />
        </View>
      </View>

      <View style={styles.tierCard}>
        <Text style={styles.tierTitle}>
          {activeTier?.medal} Now filling: {activeTier?.label}
        </Text>
        <Text style={styles.tierDetail}>
          {activeTier?.platformFeeDiscountPercent}% off platform fee · {activeTier?.durationLabel} ·{" "}
          {activeTierRemaining} spots left in this tier
        </Text>
        <View style={styles.tierRow}>
          {LAUNCH_PROMOTION_TIERS.map((tier, idx) => {
            const joined =
              idx === 0 ? creatorCounts.tier1 : idx === 1 ? creatorCounts.tier2 : creatorCounts.tier3;
            const remaining = Math.max(0, tier.capacity - joined);
            return (
              <View key={tier.tier} style={styles.miniTier}>
                <Text style={styles.miniTierLabel}>
                  {tier.medal} T{tier.tier}
                </Text>
                <Text style={styles.miniTierCount}>{remaining} left</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/affiliate-dashboard")}
        style={styles.ctaOutline}
      >
        <Text style={styles.ctaOutlineText}>Share your referral link →</Text>
      </Pressable>
    </BrandGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    overflow: "hidden",
  },
  inactiveWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  inactiveTitle: { fontSize: 16, fontWeight: "800" },
  inactiveSub: { fontSize: 13, lineHeight: 19 },
  tag: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  headline: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.9)", fontSize: 12, lineHeight: 18 },
  countdownCard: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  countdownRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  countdownUnit: { alignItems: "center", minWidth: 44 },
  countdownValue: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  countdownUnitLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 9,
    fontWeight: "600",
  },
  countdownSep: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 18,
    fontWeight: "700",
    marginTop: -6,
  },
  tierCard: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  tierTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  tierDetail: { color: "rgba(255,255,255,0.88)", fontSize: 11, lineHeight: 16 },
  tierRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  miniTier: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    gap: 2,
  },
  miniTierLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  miniTierCount: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600" },
  cta: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  ctaOutline: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ctaOutlineText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
