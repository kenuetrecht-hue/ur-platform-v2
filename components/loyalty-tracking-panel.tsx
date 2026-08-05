import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

function formatEventLabel(type: string): string {
  switch (type) {
    case "welcome_bonus":
      return "Welcome bonus";
    case "daily_sign_in":
      return "Daily sign-in";
    case "streak_reset":
      return "Streak reset";
    case "milestone_pending":
      return "Milestone unlocked";
    case "milestone_claimed":
      return "Milestone claimed";
    case "points_spent_chat":
      return "Points spent (chat)";
    case "free_message_used":
      return "Free message used";
    default:
      return type;
  }
}

export function LoyaltyTrackingPanel() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const dashboard = trpc.loyalty.getDashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const status = trpc.loyalty.getStatus.useQuery(undefined, { enabled: isAuthenticated });
  const claimSignIn = trpc.loyalty.claimDailySignIn.useMutation({
    onSuccess: () => {
      void dashboard.refetch();
      void status.refetch();
    },
  });
  const claimMilestone = trpc.loyalty.claimMilestone.useMutation({
    onSuccess: () => void dashboard.refetch(),
  });

  if (!isAuthenticated) return null;

  if (dashboard.isLoading) {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const data = dashboard.data;
  if (!data) return null;

  const { account, recentEvents, recentSignIns, freeMessageGrants } = data;

  return (
    <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
        Loyalty tracking
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Daily sign-ins, streak, points earned/spent, and free message grants.
      </Text>

      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={{ color: colors.muted, fontSize: 10 }}>Balance</Text>
          <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 18 }}>
            {account.totalPoints.toLocaleString()}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={{ color: colors.muted, fontSize: 10 }}>Streak</Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
            {account.currentStreakDays}d
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={{ color: colors.muted, fontSize: 10 }}>Sign-ins</Text>
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
            {account.totalSignIns}
          </Text>
        </View>
      </View>

      {!account.claimedToday ? (
        <Pressable
          onPress={() => claimSignIn.mutate()}
          disabled={claimSignIn.isPending}
          style={[styles.claimBtn, { backgroundColor: colors.primary }]}
        >
          {claimSignIn.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800" }}>Claim today&apos;s sign-in</Text>
          )}
        </Pressable>
      ) : (
        <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 12, marginTop: 8 }}>
          ✓ Today&apos;s sign-in claimed
        </Text>
      )}

      {(status.data?.pendingMilestones ?? []).length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Streak rewards ready</Text>
          {(status.data?.pendingMilestones ?? []).map((m) => (
            <Pressable
              key={m.day}
              onPress={() => {
                claimMilestone.mutate({
                  creatorId: "ai-wellness-001",
                  milestoneDay: m.day,
                });
              }}
              disabled={claimMilestone.isPending}
              style={[styles.claimBtn, { backgroundColor: `${colors.primary}22`, marginTop: 4 }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 11 }}>
                Claim {m.freeTextMessages} free msgs — {m.label}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>
                Applies to AI Wellness Coach (choose specialist support coming soon)
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}

      {freeMessageGrants.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Free message grants</Text>
          {freeMessageGrants.slice(0, 5).map((g) => (
            <Text key={g.id} style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>
              {g.creatorId}: {g.messagesRemaining}/{g.messagesGranted} left · day {g.milestoneDay}{" "}
              streak
            </Text>
          ))}
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text>
      {recentEvents.length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 11 }}>No activity yet — claim your first sign-in.</Text>
      ) : (
        recentEvents.slice(0, 8).map((e) => (
          <View key={e.id} style={styles.eventRow}>
            <Text style={{ color: colors.foreground, fontSize: 11, flex: 1 }} numberOfLines={1}>
              {formatEventLabel(e.eventType)}
            </Text>
            <Text
              style={{
                color: e.pointsDelta >= 0 ? colors.primary : "#c55",
                fontWeight: "700",
                fontSize: 11,
                minWidth: 52,
                textAlign: "right",
              }}
            >
              {e.pointsDelta >= 0 ? "+" : ""}
              {e.pointsDelta}
            </Text>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 10 }]}>Sign-in log</Text>
      {recentSignIns.slice(0, 7).map((s) => (
        <Text key={s.id} style={{ color: colors.muted, fontSize: 10, marginBottom: 3 }}>
          {s.signInDate} · +{s.pointsEarned + s.welcomeBonusIncluded} LP · streak {s.streakDaysAfter}
          {s.streakWasReset ? " (reset)" : ""}
        </Text>
      ))}

      <Text style={{ color: colors.muted, fontSize: 9, marginTop: 10, lineHeight: 13 }}>
        Earned: {account.totalPointsEarned.toLocaleString()} · Spent:{" "}
        {account.totalPointsSpent.toLocaleString()} · 500 LP per text message · Text-only via loyalty
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  stat: { flex: 1, alignItems: "center" },
  claimBtn: {
    marginTop: 10,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
});
