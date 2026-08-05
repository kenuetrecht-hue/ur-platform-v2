import { View, Text, Pressable, StyleSheet } from "react-native";
import { BrandGradient } from "@/components/brand-gradient";
import { withAlpha } from "@/lib/brand-theme";

export interface LaunchPromotionBannerProps {
  tier?: "tier_1" | "tier_2" | "tier_3" | null;
  discount?: number;
  durationDays?: number;
  lifetimeEntries?: number;
  onLearnMore?: () => void;
}

export function LaunchPromotionBanner({
  tier,
  discount = 0,
  durationDays = 0,
  onLearnMore,
}: LaunchPromotionBannerProps) {
  let promotionMessage = "Join UR during launch and unlock exclusive promotions";
  if (tier === "tier_1") {
    promotionMessage = `Tier 1: ${discount}% off for ${durationDays} days + lifetime drawing entries`;
  } else if (tier === "tier_2") {
    promotionMessage = `Tier 2 launch: ${discount}% off for ${durationDays} days`;
  } else if (tier === "tier_3") {
    promotionMessage = `Tier 3 launch: ${discount}% off for ${durationDays} days`;
  }

  const subtext =
    tier === "tier_1"
      ? "First 100 users · 24-hour zero-fee window + extended discount"
      : tier === "tier_2"
        ? "Users 101–200 · 24-hour zero-fee window + 3-month discount"
        : tier === "tier_3"
          ? "Users 201–300 · 24-hour zero-fee window + 1-month discount"
          : "Limited time — first 300 users";

  return (
    <BrandGradient variant="brand" style={styles.banner}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>{promotionMessage}</Text>
          <Text style={styles.subtitle}>{subtext}</Text>
        </View>
        {onLearnMore ? (
          <Pressable
            onPress={onLearnMore}
            style={[styles.btn, { backgroundColor: withAlpha("#FFFFFF", 0.22) }]}
          >
            <Text style={styles.btnText}>Learn more</Text>
          </Pressable>
        ) : null}
      </View>
    </BrandGradient>
  );
}

export function CompactLaunchPromotionBanner({
  tier,
  discount = 0,
}: LaunchPromotionBannerProps) {
  return (
    <BrandGradient variant="brand" style={styles.compact}>
      <Text style={styles.compactText}>
        {tier === "tier_1"
          ? `${discount}% off + lifetime entries`
          : tier === "tier_2"
            ? `${discount}% off launch offer`
            : tier === "tier_3"
              ? `${discount}% off launch offer`
              : "Launch promotion active"}
      </Text>
    </BrandGradient>
  );
}

export function GenesisClock24HourBanner({
  endTime,
  onLearnMore,
}: {
  endTime?: Date;
  onLearnMore?: () => void;
}) {
  if (!endTime) return null;

  const now = new Date();
  const hoursRemaining = Math.ceil((endTime.getTime() - now.getTime()) / (1000 * 60 * 60));
  if (hoursRemaining <= 0) return null;

  return (
    <BrandGradient variant="soft" style={styles.genesis}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: "#312E81" }]}>
            Genesis Clock · 0% platform fee for {hoursRemaining}h
          </Text>
          <Text style={[styles.subtitle, { color: "#4338CA" }]}>
            Your 24-hour zero-fee window is active
          </Text>
        </View>
        {onLearnMore ? (
          <Pressable onPress={onLearnMore} style={styles.genesisBtn}>
            <Text style={styles.genesisBtnText}>Details</Text>
          </Pressable>
        ) : null}
      </View>
    </BrandGradient>
  );
}

export function FreeDayOfServiceBanner({
  expiresAt,
  onRedeem,
}: {
  expiresAt?: Date;
  onRedeem?: () => void;
}) {
  if (!expiresAt) return null;

  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) return null;

  return (
    <BrandGradient variant="brand" style={styles.compact}>
      <View style={styles.row}>
        <Text style={[styles.compactText, { flex: 1 }]}>
          Free day of service · expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}
        </Text>
        {onRedeem ? (
          <Pressable onPress={onRedeem} style={[styles.btn, { backgroundColor: withAlpha("#FFFFFF", 0.22) }]}>
            <Text style={styles.btnText}>Redeem</Text>
          </Pressable>
        ) : null}
      </View>
    </BrandGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  compact: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  genesis: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  subtitle: {
    color: withAlpha("#FFFFFF", 0.88),
    fontSize: 11,
    lineHeight: 15,
  },
  btn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
  },
  compactText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  genesisBtn: {
    backgroundColor: withAlpha("#4F46E5", 0.15),
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genesisBtnText: {
    color: "#4338CA",
    fontWeight: "700",
    fontSize: 11,
  },
});
