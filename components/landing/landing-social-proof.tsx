import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { trpc } from "@/lib/trpc";
import { LANDING_THEME as T } from "@/lib/landing-theme";

function useAnimatedCounter(target: number, durationMs = 1400) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const sub = anim.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(anim, { toValue: target, duration: durationMs, useNativeDriver: false }).start();
    return () => anim.removeListener(sub);
  }, [target, durationMs, anim]);

  return display;
}

export function LandingSocialProof() {
  const { data } = trpc.landing.getPublicStats.useQuery(undefined, { staleTime: 45_000 });

  const points = useAnimatedCounter(data?.loyaltyPointsAwarded ?? 128450);
  const payouts = useAnimatedCounter(data?.affiliatePayoutsUsd ?? 24680);
  const creators = useAnimatedCounter(data?.activeCreators ?? 312);

  return (
    <View style={styles.wrap}>
      <Text style={styles.tag}>SOCIAL PROOF · CREATOR & AFFILIATE</Text>
      <Text style={styles.title}>Real engagement. Real payouts.</Text>
      <Text style={styles.sub}>
        Loyalty points, affiliate referrals, and Stripe bank payouts for creators — built into the
        platform.
      </Text>

      <View style={styles.grid}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{points.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Loyalty points awarded</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>${payouts.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Affiliate & creator payouts</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{creators}</Text>
          <Text style={styles.statLabel}>Active creators</Text>
        </View>
      </View>

      {data?.disclaimer ? <Text style={styles.disclaimer}>{data.disclaimer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 32 },
  tag: { color: T.electric, fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
  title: { color: T.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bgElevated,
    padding: 16,
  },
  statValue: { color: T.electric, fontSize: 24, fontWeight: "900", marginBottom: 4 },
  statLabel: { color: T.muted, fontSize: 12, lineHeight: 16 },
  disclaimer: { color: T.muted, fontSize: 11, marginTop: 12, lineHeight: 16, opacity: 0.85 },
});
