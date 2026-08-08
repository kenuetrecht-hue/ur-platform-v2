import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { PlatformSectionId } from "@/lib/platform-section-flags";

type Props = {
  canManage: boolean;
};

export function PlatformSectionMaintenancePanel({ canManage }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const sections = trpc.platformOps.listSections.useQuery(undefined, { enabled: canManage });
  const [reason, setReason] = useState("");
  const [expandedId, setExpandedId] = useState<PlatformSectionId | null>(null);

  const disable = trpc.platformOps.disableSection.useMutation({
    onSuccess: () => {
      setReason("");
      void utils.platformOps.listSections.invalidate();
      void utils.platformOps.getPublicSectionFlags.invalidate();
      void utils.platformOps.dashboard.invalidate();
    },
  });

  const enable = trpc.platformOps.enableSection.useMutation({
    onSuccess: () => {
      void utils.platformOps.listSections.invalidate();
      void utils.platformOps.getPublicSectionFlags.invalidate();
      void utils.platformOps.dashboard.invalidate();
    },
  });

  if (!canManage) return null;

  return (
    <View style={{ gap: 10, paddingHorizontal: 16 }}>
      <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0 }]}>
        Section maintenance
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
        Shut down one area without taking UR offline. Ops AIs can propose isolation via incidents;
        you give final OK. Reopen when the fix is verified.
      </Text>

      {sections.isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {(sections.data ?? []).map((section) => (
        <View
          key={section.id}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Pressable onPress={() => setExpandedId(expandedId === section.id ? null : section.id)}>
            <View style={styles.row}>
              <Text style={{ fontWeight: "700", color: colors.foreground, flex: 1 }}>
                {section.label}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: section.enabled ? "#059669" : "#dc2626",
                  textTransform: "uppercase",
                }}
              >
                {section.enabled ? "online" : "offline"}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{section.description}</Text>
          </Pressable>

          {expandedId === section.id ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {!section.enabled && section.reason ? (
                <Text style={{ color: colors.muted, fontSize: 12 }}>Reason: {section.reason}</Text>
              ) : null}
              {section.enabled ? (
                <>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Why take this section offline?"
                    placeholderTextColor={colors.muted}
                    multiline
                    style={[
                      styles.input,
                      { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                    ]}
                  />
                  <Pressable
                    onPress={() =>
                      disable.mutate({
                        sectionId: section.id,
                        reason: reason.trim() || `Maintenance on ${section.label}`,
                      })
                    }
                    disabled={disable.isPending}
                    style={[styles.btn, { backgroundColor: "#dc2626" }]}
                  >
                    <Text style={styles.btnText}>Take offline</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() =>
                    enable.mutate({
                      sectionId: section.id,
                      ownerNote: "Owner reopened section after fix verified",
                    })
                  }
                  disabled={enable.isPending}
                  style={[styles.btn, { backgroundColor: "#059669" }]}
                >
                  <Text style={styles.btnText}>Reopen section</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: "700", paddingHorizontal: 16 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 64,
  },
  btn: { borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
