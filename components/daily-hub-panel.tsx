import { useRouter } from "expo-router";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { DemoSection } from "@/components/demo-section";

export function DailyHubPanel() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const hub = trpc.dailyEngagement.getHub.useQuery(undefined, { retry: 1 });
  const preview = trpc.dailyEngagement.getHubPreview.useQuery(undefined, {
    enabled: hub.isError,
    retry: 1,
  });
  const recordActivity = trpc.dailyEngagement.recordActivity.useMutation({
    onSuccess: () => void utils.dailyEngagement.getHub.invalidate(),
  });

  const data = hub.data ?? preview.data;
  const loading = hub.isLoading && preview.isLoading;

  if (loading) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  const { specialistOfDay, dailyInsight, dailyChallenge, engagement, features } = data;
  const streak = engagement?.streakDays ?? 0;

  const openSpecialist = (creatorId: string, prompt?: string) => {
    router.push({
      pathname: "/ais",
      params: prompt ? { ai: creatorId, prompt } : { ai: creatorId },
    });
  };

  const acceptChallenge = () => {
    recordActivity.mutate({
      creatorId: specialistOfDay.creatorId,
      activityType: "challenge",
    });
    openSpecialist(specialistOfDay.creatorId, dailyChallenge.prompt);
  };

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <View
        style={[
          styles.heroCard,
          { backgroundColor: `${colors.primary}14`, borderColor: colors.primary },
        ]}
      >
        <View style={styles.heroTop}>
          <Text style={{ fontSize: 28 }}>{streak > 0 ? "🔥" : "✨"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              {streak > 0 ? `${streak}-day streak` : "Start your streak today"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {specialistOfDay.dayLabel} · Chat or learn daily to keep it going
            </Text>
          </View>
          {engagement?.totalActiveDays ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                {engagement.totalActiveDays}
              </Text>
              <Text style={{ color: "#fff", fontSize: 9 }}>days</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
          💡 {dailyInsight}
        </Text>
      </View>

      <Pressable
        onPress={() => openSpecialist(specialistOfDay.creatorId)}
        style={[styles.specialistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "700", letterSpacing: 0.5 }}>
          SPECIALIST OF THE DAY
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
          <Text style={{ fontSize: 36 }}>{specialistOfDay.avatar}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground }}>
              {specialistOfDay.name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{specialistOfDay.category}</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
              {specialistOfDay.mission}
            </Text>
          </View>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Chat →</Text>
        </View>
      </Pressable>

      {engagement?.lastCreatorId && engagement.lastCreatorName ? (
        <Pressable
          onPress={() => openSpecialist(engagement.lastCreatorId!)}
          style={[styles.continueCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>CONTINUE</Text>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15, marginTop: 2 }}>
            Pick up with {engagement.lastCreatorName}
          </Text>
        </Pressable>
      ) : null}

      <View style={[styles.challengeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ fontSize: 11, color: colors.muted, fontWeight: "700" }}>
          TODAY&apos;S CHALLENGE · ~{dailyChallenge.estimatedMinutes} min
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.foreground, marginTop: 6 }}>
          {dailyChallenge.title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
          {dailyChallenge.prompt}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={acceptChallenge}
            style={[styles.challengeBtn, { backgroundColor: colors.primary, flex: 1 }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Accept challenge</Text>
          </Pressable>
          <Pressable
            onPress={() => openSpecialist(specialistOfDay.creatorId)}
            style={[styles.challengeBtn, { borderColor: colors.border, borderWidth: 1 }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Learn</Text>
          </Pressable>
        </View>
      </View>

      <DemoSection title="Why people come back daily" description="" icon="🌟" variant="info">
        <View style={{ gap: 8, marginTop: 4 }}>
          {features.map((f) => (
            <View key={f.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Text style={{ fontSize: 18 }}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }}>{f.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </DemoSection>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: 16, borderWidth: 1.5, padding: 16 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroTitle: { fontSize: 17, fontWeight: "800" },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  specialistCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  continueCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  challengeCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  challengeBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
});
