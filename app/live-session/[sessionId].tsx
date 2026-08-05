import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export default function LiveSessionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = typeof sessionId === "string" ? sessionId : "";
  const { isAuthenticated } = useAuth();

  const access = trpc.aiLiveSessions.joinAccess.useQuery(
    { sessionId: id },
    { enabled: Boolean(id) && isAuthenticated, retry: 1 },
  );
  const publicSession = trpc.aiLiveSessions.getPublicSession.useQuery(
    { sessionId: id },
    { enabled: Boolean(id) },
  );

  if (!id) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.foreground, padding: 24 }}>Invalid session.</Text>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: "Live session" }} />
        <ScreenContainer className="bg-background">
          <View style={styles.center}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 17 }}>Sign in required</Text>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              Purchase or access your ticket after signing in.
            </Text>
            <Pressable
              onPress={() => router.push("/login")}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnText}>Sign in</Text>
            </Pressable>
          </View>
        </ScreenContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: publicSession.data?.title ?? "Live session",
          headerBackTitle: "Back",
        }}
      />
      <ScreenContainer className="bg-background">
        {access.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : access.error ? (
          <View style={styles.center}>
            <Text style={{ color: colors.foreground }}>{access.error.message}</Text>
          </View>
        ) : access.data && !access.data.hasAccess ? (
          <View style={styles.center}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 17 }}>
              Ticket required
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              {access.data.message}
            </Text>
            {publicSession.data ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/ais", params: { ai: publicSession.data!.creatorAiId } })
                }
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Get ticket on AI page</Text>
              </Pressable>
            ) : null}
          </View>
        ) : access.data && !access.data.canEnter ? (
          <View style={[styles.lobby, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 40 }}>⏳</Text>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
              {access.data.session.title}
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 21 }}>
              {access.data.message}
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13 }}>
              Lobby opens: {new Date(access.data.opensAt).toLocaleString()}
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13 }}>
              Session ends: {new Date(access.data.endsAt).toLocaleString()}
            </Text>
            {access.data.roomCode ? (
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Room code: {access.data.roomCode}
              </Text>
            ) : null}
          </View>
        ) : access.data?.canEnter ? (
          <View style={{ flex: 1 }}>
            <View style={[styles.liveBar, { backgroundColor: "#e74c3c" }]}>
              <Text style={styles.liveBarText}>● LIVE — {access.data.session.creatorName}</Text>
              <Text style={styles.liveBarSub}>
                Room {access.data.roomCode} · committed {access.data.session.committedDurationMinutes}{" "}
                min
                {access.data.commitment && !access.data.commitment.commitmentFulfilled
                  ? ` · ${access.data.commitment.committedMinutesRemaining} min left in commitment`
                  : access.data.session.overtimeMinutes > 0
                    ? ` · +${access.data.session.overtimeMinutes} min overtime`
                    : ""}
              </Text>
            </View>
            {access.data.commitment && !access.data.commitment.commitmentFulfilled ? (
              <View style={[styles.commitBar, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}>
                <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
                  {access.data.commitment.mustStayUntilMessage}
                </Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <CreatorAIInterface
                creatorId={access.data.session.creatorAiId}
                creatorName={access.data.session.creatorName}
                welcomeMessage={`Welcome to **${access.data.session.title}**. I'm committed to the full **${access.data.session.committedDurationMinutes} minutes** with you — ask questions anytime.`}
                initialPrompt={access.data.hostPrompt ?? undefined}
              />
            </View>
          </View>
        ) : null}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  lobby: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  btn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  liveBar: { paddingHorizontal: 16, paddingVertical: 10 },
  liveBarText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  liveBarSub: { color: "#fff", opacity: 0.9, fontSize: 11, marginTop: 2 },
  commitBar: { marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
});
