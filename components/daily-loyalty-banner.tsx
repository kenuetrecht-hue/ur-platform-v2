import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { BrandGradient } from "@/components/brand-gradient";
import { brandHighlightSurface, withAlpha } from "@/lib/brand-theme";

export interface DailyLoyaltyBannerProps {
  totalPoints?: number;
  pointsEarnedToday?: number;
  totalSignIns?: number;
  currentStreakDays?: number;
  milestoneUnlocked?: { day: number; freeTextMessages: number; label: string } | null;
  nextMilestone?: { day: number; freeTextMessages: number; label: string } | null;
  alreadyClaimedToday?: boolean;
}

export function DailyLoyaltyBanner({
  totalPoints = 0,
  pointsEarnedToday = 0,
  totalSignIns = 0,
  currentStreakDays = 0,
  milestoneUnlocked = null,
  nextMilestone = null,
  alreadyClaimedToday = false,
}: DailyLoyaltyBannerProps) {
  const colors = useColors();
  const highlight = brandHighlightSurface(colors);

  if (alreadyClaimedToday && pointsEarnedToday === 0) {
    return (
      <View
        style={[
          styles.claimed,
          {
            borderBottomColor: withAlpha(colors.secondary, 0.2),
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>
          Daily loyalty claimed · {currentStreakDays}-day streak
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
          {totalPoints.toLocaleString()} LP ·{" "}
          {nextMilestone ? `Next: ${nextMilestone.label}` : "Keep your streak going"}
        </Text>
      </View>
    );
  }

  return (
    <BrandGradient variant="soft" style={[styles.active, highlight]}>
      <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }}>
        +{pointsEarnedToday.toLocaleString()} loyalty points
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Balance: {totalPoints.toLocaleString()} LP · Streak: {currentStreakDays} day
        {currentStreakDays === 1 ? "" : "s"} · Sign-ins: {totalSignIns}
      </Text>
      {milestoneUnlocked ? (
        <Text style={{ color: colors.secondary, fontWeight: "600", fontSize: 11, marginTop: 6 }}>
          {milestoneUnlocked.label} — claim free text messages from Profile
        </Text>
      ) : null}
      {!milestoneUnlocked && nextMilestone ? (
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
          {nextMilestone.day - currentStreakDays} day(s) until {nextMilestone.freeTextMessages} free
          messages
        </Text>
      ) : null}
      <Text style={{ color: withAlpha(colors.muted, 0.9), fontSize: 9, marginTop: 6 }}>
        500 LP per text message · Streak resets if you miss a day
      </Text>
    </BrandGradient>
  );
}

const styles = StyleSheet.create({
  claimed: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  active: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
