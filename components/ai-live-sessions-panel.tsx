import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export type AiLiveSessionsPanelProps = {
  creatorId: string;
  creatorName: string;
};

export function AiLiveSessionsPanel({ creatorId, creatorName }: AiLiveSessionsPanelProps) {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const sessions = trpc.aiLiveSessions.listUpcoming.useQuery({ creatorAiId: creatorId });
  const checkout = trpc.aiLiveSessions.createCheckout.useMutation();
  const confirm = trpc.aiLiveSessions.confirmPayment.useMutation({
    onSuccess: () => {
      void utils.aiLiveSessions.listUpcoming.invalidate();
    },
  });

  const buyTicket = async (sessionId: string) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setBusySessionId(sessionId);
    try {
      const result = await checkout.mutateAsync({ sessionId });
      if (result.mode === "checkout") {
        await confirm.mutateAsync({ paymentIntentId: result.paymentIntentId });
      }
      router.push(`/live-session/${sessionId}`);
    } finally {
      setBusySessionId(null);
    }
  };

  if (sessions.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!sessions.data?.length) {
    return (
      <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 32 }}>🎥</Text>
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>
          No live sessions scheduled
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
          When {creatorName} hosts a paid video session, it will appear here. Check back soon or ask in
          chat about upcoming events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 4, paddingHorizontal: 4 }}>
        Join a live hour with {creatorName}. Buy a ticket, then enter the room when the lobby opens (15
        min before start).
      </Text>
      {sessions.data.map((s) => {
        const start = new Date(s.startsAt);
        const busy = busySessionId === s.id;
        const soldOut = s.spotsLeft <= 0;
        return (
          <View
            key={s.id}
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={styles.badgeRow}>
              <Text
                style={[
                  styles.badge,
                  {
                    backgroundColor: s.status === "live" ? "#e74c3c" : `${colors.primary}22`,
                    color: s.status === "live" ? "#fff" : colors.primary,
                  },
                ]}
              >
                {s.status === "live" ? "LIVE NOW" : "UPCOMING"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {s.durationMinutes} min · {s.spotsLeft} spots left
              </Text>
            </View>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{s.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }} numberOfLines={3}>
              {s.description}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
              Committed: {s.committedDurationLabel ?? `${s.durationMinutes} min`} — host stays for
              the full time
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 4 }}>
              📅 {start.toLocaleString()} · 💵 ${s.pricePerMinuteUsd}/min · ${s.priceUsd} ticket ·
              up to {s.maxAttendees.toLocaleString()} seats
            </Text>
            <Pressable
              disabled={busy || soldOut || s.status === "ended"}
              onPress={() => buyTicket(s.id)}
              style={[
                styles.cta,
                {
                  backgroundColor: soldOut ? colors.border : colors.primary,
                  opacity: busy ? 0.7 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>
                  {soldOut
                    ? "Sold out"
                    : s.priceCents === 0
                      ? "Reserve free seat"
                      : `Buy ticket · $${s.priceUsd} (${s.durationMinutes} min @ $${s.pricePerMinuteUsd}/min)`}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  empty: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  list: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: "hidden" },
  cta: { borderRadius: 10, padding: 14, alignItems: "center", marginTop: 4 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
