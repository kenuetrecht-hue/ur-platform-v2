import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { allPlayroomPlans, countPlanLayers, type PlayroomPlanId } from "@/lib/workspace-playroom-plans";
import type { usePlayroomBuilder } from "@/hooks/use-playroom-builder";

type Builder = ReturnType<typeof usePlayroomBuilder>;

export function WorkspacePlayroomPanel({
  builder,
  sessionReady,
}: {
  builder: Builder;
  sessionReady: boolean;
}) {
  const colors = useColors();
  const plans = allPlayroomPlans();

  return (
    <View style={[styles.panel, { borderColor: colors.primary, backgroundColor: `${colors.primary}08` }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>🎪 AI Playroom</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
        Planner + Builder AIs team up to construct scenes layer-by-layer. Start with E-I-E-I-O, then the
        house with eyes, then what a car!
      </Text>

      {!sessionReady ? (
        <Text style={{ color: "#d97706", fontSize: 12, marginBottom: 8 }}>
          Save a workspace session below so builds can be saved.
        </Text>
      ) : null}

      {builder.building ? (
        <View style={[styles.buildBanner, { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }]}>
          <ActivityIndicator color={colors.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
              Building… {builder.progress}%
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>
              {builder.plannerMsg}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 11 }} numberOfLines={1}>
              {builder.builderMsg}
            </Text>
          </View>
          <Pressable onPress={builder.cancel} style={styles.cancelBtn}>
            <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 11 }}>Stop</Text>
          </Pressable>
        </View>
      ) : builder.plannerMsg ? (
        <View style={[styles.doneBanner, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>{builder.plannerMsg}</Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{builder.builderMsg}</Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        {plans.map((plan) => (
          <Pressable
            key={plan.id}
            disabled={builder.building}
            onPress={() => void builder.runPlan(plan.id)}
            style={[styles.planCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ fontSize: 22 }}>{plan.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>{plan.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }} numberOfLines={2}>
                {plan.description}
              </Text>
              {plan.songLine ? (
                <Text style={{ color: colors.primary, fontSize: 10, fontStyle: "italic", marginTop: 2 }}>
                  {plan.songLine}
                </Text>
              ) : null}
            </View>
            <Text style={{ color: colors.muted, fontSize: 10 }}>{countPlanLayers(plan)} parts</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        disabled={builder.building}
        onPress={() => void builder.runAll()}
        style={[styles.runAllBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.runAllText}>
          {builder.building ? "Building…" : "▶ Build ALL — Farm → House → Car"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
    gap: 4,
  },
  title: { fontSize: 17, fontWeight: "800" },
  buildBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  doneBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 4 },
  cancelBtn: { padding: 8 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  runAllBtn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 10 },
  runAllText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
