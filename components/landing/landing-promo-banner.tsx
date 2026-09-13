import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  initializePromotionalSystem,
  updatePromotionalState,
} from "@/lib/promotional-banner-system";
import {
  LAUNCH_PROMOTION_HEADLINE,
  LAUNCH_PROMOTION_SUBLINE,
  LAUNCH_PROMOTION_TIERS,
  LAUNCH_SIGNUP_WINDOW_DAYS,
  PLATFORM_FEE_PERCENT,
  parseAffiliateRefFromInput,
  buildCreatorSignupHref,
} from "@/lib/launch-promotion-config";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { trpc } from "@/lib/trpc";
import { TapToRead } from "@/components/tap-to-read";

function CountdownUnit({ value, label, padded }: { value: number; label: string; padded?: boolean }) {
  const display = padded ? String(value).padStart(2, "0") : value;
  return (
    <View style={styles.countdownUnit}>
      <Text style={styles.countdownValue}>{display}</Text>
      <Text style={styles.countdownUnitLabel}>{label}</Text>
    </View>
  );
}

export function LandingPromoBanner() {
  const router = useRouter();
  const [affiliateInput, setAffiliateInput] = useState("");
  const [affiliateError, setAffiliateError] = useState<string | null>(null);
  const [promoState, setPromoState] = useState(() => initializePromotionalSystem());
  const stats = trpc.stamps.getPromotionStats.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const creatorCounts = useMemo(
    () => ({
      tier1: stats.data?.tier1?.joined ?? 0,
      tier2: stats.data?.tier2?.joined ?? 0,
      tier3: stats.data?.tier3?.joined ?? 0,
    }),
    [stats.data],
  );

  useEffect(() => {
    const tick = () => {
      setPromoState((prev) => updatePromotionalState(prev, creatorCounts));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [creatorCounts]);

  const tier1 = promoState.tiers[0];
  const tier1Joined = creatorCounts.tier1;
  const tier1Remaining = stats.data?.tier1?.remaining ?? (tier1 ? tier1.capacity - tier1Joined : 100);
  const tier1Progress = tier1 ? Math.min(100, (tier1Joined / tier1.capacity) * 100) : 0;
  const totalRemaining = stats.data?.totalRemaining ?? promoState.totalSpotsRemaining;
  const isActive = stats.data?.isActive ?? promoState.isActive;

  const parsedRef = useMemo(() => parseAffiliateRefFromInput(affiliateInput), [affiliateInput]);

  const join = () => {
    setAffiliateError(null);
    if (affiliateInput.trim() && !parsedRef) {
      setAffiliateError("Enter a valid affiliate code or paste your referral link.");
      return;
    }
    router.push(buildCreatorSignupHref(parsedRef) as never);
  };

  if (!isActive) {
    return (
      <View style={[styles.wrap, styles.inactive]}>
        <Text style={styles.inactiveText}>Launch window closed — create an account to join the platform.</Text>
        <Pressable onPress={() => router.push("/signup")} style={styles.cta}>
          <Text style={styles.ctaText}>Sign up →</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[T.brandBlue, T.brandPurple]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={[styles.glow, { pointerEvents: "none" }]} />

      <Text style={styles.tag}>
        {LAUNCH_SIGNUP_WINDOW_DAYS}-DAY LAUNCH · {totalRemaining} SPOTS LEFT · {tier1Remaining} TIER 1
      </Text>
      <Text style={styles.headline}>{LAUNCH_PROMOTION_HEADLINE}</Text>
      <TapToRead title="How the 30-day creator launch works">
        {LAUNCH_PROMOTION_SUBLINE}
      </TapToRead>

      <View style={styles.countdownCard}>
        <Text style={styles.countdownLabel}>Launch signup window ends in</Text>
        <View style={styles.countdownRow}>
          <CountdownUnit value={promoState.daysRemaining} label="days" />
          <Text style={styles.countdownSep}>:</Text>
          <CountdownUnit value={promoState.hoursRemaining} label="hrs" padded />
          <Text style={styles.countdownSep}>:</Text>
          <CountdownUnit value={promoState.minutesRemaining} label="min" padded />
        </View>
      </View>

      <View style={styles.tierFeatured}>
        <Text style={styles.tierFeaturedTitle}>
          {LAUNCH_PROMOTION_TIERS[0]!.medal} {LAUNCH_PROMOTION_TIERS[0]!.label}
        </Text>
        <Text style={styles.tierFeaturedRange}>{LAUNCH_PROMOTION_TIERS[0]!.range}</Text>
        <Text style={styles.tierFeaturedHeadline}>
          {LAUNCH_PROMOTION_TIERS[0]!.platformFeeDiscountPercent}% off the {PLATFORM_FEE_PERCENT}% platform fee ·{" "}
          {LAUNCH_PROMOTION_TIERS[0]!.durationLabel}
        </Text>
        <Text style={styles.tierFeaturedBody}>
          {tier1Joined} / 100 joined · {tier1Remaining} spots left
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${tier1Progress}%` }]} />
        </View>
        <TapToRead title="Tier 1 extras">
          {LAUNCH_PROMOTION_TIERS[0]!.extras.map((line) => (
            <Text key={line} style={styles.tierBullet}>
              · {line}
            </Text>
          ))}
        </TapToRead>
      </View>

      <View style={styles.tierRow}>
        {LAUNCH_PROMOTION_TIERS.slice(1).map((tier) => (
          <View key={tier.tier} style={styles.miniTier}>
            <Text style={styles.miniTierLabel}>
              {tier.medal} Tier {tier.tier}
            </Text>
            <Text style={styles.miniTierRange}>{tier.range}</Text>
            <Text style={styles.miniTierDetail}>
              {tier.platformFeeDiscountPercent}% off platform fee · {tier.durationLabel}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.affiliateBox}>
        <Text style={styles.affiliateLabel}>Referred by an affiliate? (optional)</Text>
        <Text style={styles.affiliateHint}>
          Paste their referral link or enter their affiliate code — we attach it when you sign up.
          They earn $5 only after your first 24 free hours and five later sales. Sales during those
          first 24 hours do not count.
        </Text>
        <TextInput
          value={affiliateInput}
          onChangeText={(v) => {
            setAffiliateInput(v);
            setAffiliateError(null);
          }}
          placeholder="e.g. KEN2026 or https://urplatform.llc/signup?ref=..."
          placeholderTextColor="rgba(255,255,255,0.45)"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={240}
          style={styles.affiliateInput}
        />
        {parsedRef ? (
          <Text style={styles.affiliateOk}>Referral attached: {parsedRef}</Text>
        ) : null}
        {affiliateError ? <Text style={styles.affiliateErr}>{affiliateError}</Text> : null}
      </View>

      <Pressable onPress={join} style={styles.cta}>
        <Text style={styles.ctaText}>
          {parsedRef ? `Join with referral ${parsedRef} →` : "Sign up →"}
        </Text>
      </Pressable>

      <Text style={styles.footerNote}>
        Tier is assigned automatically by signup order during the {LAUNCH_SIGNUP_WINDOW_DAYS}-day window.
        No coupon needed — your slot is your promotion. Bring 2,000 different people in these 30 days
        (1,000 followers + 1,000 paid subscribers): a full year of 50% off. Bring 4,000 (2,000
        followers + 2,000 paid subscribers) in those same 30 days and that year is 60% off instead.
        If you are in the first 300, the year starts after your launch deal ends. After slot 300, 50%
        starts when you hit 2,000; 4,000 in 30 days upgrades the rest of that year to 60%. After 30
        days, new creators get regular 85/15.
      </Text>
      <Pressable onPress={() => router.push("/e-manual")}>
        <Text style={styles.footerNote}>
          Free e-manual for every new member — tap here to read and print it.
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 14,
  },
  inactive: {
    backgroundColor: T.bgElevated,
    borderColor: T.border,
  },
  inactiveText: { color: T.muted, fontSize: 14, lineHeight: 20 },
  glow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tag: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  headline: { color: "#FFFFFF", fontSize: 26, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 21 },
  countdownCard: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    padding: 16,
    gap: 10,
  },
  countdownLabel: {
    color: "rgba(255,255,255,0.85)",
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
  countdownUnit: { alignItems: "center", minWidth: 52 },
  countdownValue: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  countdownUnitLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  countdownSep: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 22,
    fontWeight: "700",
    marginTop: -8,
  },
  tierFeatured: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.35)",
    padding: 14,
    gap: 6,
  },
  tierFeaturedTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  tierFeaturedRange: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  tierFeaturedHeadline: { color: "#FFD700", fontSize: 15, fontWeight: "800", lineHeight: 21 },
  tierFeaturedBody: { color: "rgba(255,255,255,0.88)", fontSize: 12 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    marginVertical: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 3,
  },
  tierBullet: { color: "rgba(255,255,255,0.88)", fontSize: 12, lineHeight: 18 },
  tierRow: { flexDirection: "row", gap: 10 },
  miniTier: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 10,
    gap: 4,
  },
  miniTierLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  miniTierRange: { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  miniTierDetail: { color: "rgba(255,255,255,0.88)", fontSize: 11, lineHeight: 15 },
  affiliateBox: {
    backgroundColor: "rgba(0,0,0,0.16)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    padding: 12,
    gap: 6,
  },
  affiliateLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  affiliateHint: { color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 16 },
  affiliateInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
    color: "#FFFFFF",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  affiliateOk: { color: "#A7F3D0", fontSize: 11, fontWeight: "600" },
  affiliateErr: { color: "#FCA5A5", fontSize: 11, fontWeight: "600" },
  cta: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  footerNote: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
