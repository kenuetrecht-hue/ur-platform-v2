import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { useBillingState } from "@/hooks/use-billing-state";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";
import { buildClassReplayPurchaseSummary } from "@/lib/pricing-disclosures";
import { MuxVideoPlayer } from "@/components/mux-video-player";

export default function ClassReplayScreen() {
  const colors = useColors();
  const router = useRouter();
  const { replayId } = useLocalSearchParams<{ replayId: string }>();
  const id = typeof replayId === "string" ? replayId : "";
  const { isAuthenticated } = useAuth();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const utils = trpc.useUtils();

  const publicReplay = trpc.aiLiveSessions.getReplay.useQuery({ replayId: id }, { enabled: Boolean(id) });
  const watch = trpc.aiLiveSessions.watchReplay.useQuery({ replayId: id }, { enabled: Boolean(id) && isAuthenticated });
  const checkout = trpc.aiLiveSessions.createReplayCheckout.useMutation();
  const confirm = trpc.aiLiveSessions.confirmReplayPayment.useMutation({
    onSuccess: () => void utils.aiLiveSessions.watchReplay.invalidate(),
  });

  const summary =
    publicReplay.data && publicReplay.data.priceCents > 0
      ? buildClassReplayPurchaseSummary({
          title: publicReplay.data.title,
          creatorName: publicReplay.data.creatorName,
          durationMinutes: publicReplay.data.durationMinutes,
          priceCents: publicReplay.data.priceCents,
          stateCode: stateCode ?? null,
        })
      : null;

  const buy = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (publicReplay.data && publicReplay.data.priceCents > 0 && !hasState) return;
    const result = await checkout.mutateAsync({
      replayId: id,
      stateCode: publicReplay.data && publicReplay.data.priceCents > 0 ? stateCode ?? undefined : undefined,
    });
    if (result.mode === "checkout" && result.paymentIntentId) {
      await confirm.mutateAsync({ paymentIntentId: result.paymentIntentId });
    }
    await utils.aiLiveSessions.watchReplay.invalidate();
  };

  if (!id) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.foreground, padding: 24 }}>Invalid replay.</Text>
      </ScreenContainer>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: publicReplay.data?.title ?? "Class replay", headerBackTitle: "Back" }} />
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {publicReplay.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
            {publicReplay.data?.title ?? "Class replay"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            Missed the live class? Pay once and watch the recording. Live ticket holders watch free.
          </Text>

          {watch.data?.allowed ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                You can watch · {watch.data.accessReason === "live_ticket" ? "included with your live ticket" : "pay-per-view"}
              </Text>
              {watch.data.playback?.playbackId ? (
                <MuxVideoPlayer playbackId={watch.data.playback.playbackId} token={watch.data.playback.token} />
              ) : watch.data.videoUrl ? (
                <Pressable
                  onPress={() => void Linking.openURL(watch.data.videoUrl!)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.btnText}>Play video recording</Text>
                </Pressable>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {watch.data.muxStatus === "preparing" || watch.data.muxStatus === "waiting"
                    ? "Mux is preparing this recording. The class archive is below until playback is ready."
                    : "No Mux recording yet — the saved class archive is below."}
                </Text>
              )}
              {(watch.data.chapters ?? []).map((chapter, index) => (
                <View
                  key={`${chapter.label}-${index}`}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>{chapter.label}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{chapter.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {summary ? <PurchaseSummaryCard summary={summary} /> : null}
              {publicReplay.data && publicReplay.data.priceCents > 0 ? (
                <BillingStatePicker value={stateCode} onChange={setStateCode} />
              ) : null}
              <Pressable
                onPress={() => void buy()}
                disabled={checkout.isPending || confirm.isPending}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>
                  {checkout.isPending || confirm.isPending
                    ? "Opening replay…"
                    : `Watch now · $${publicReplay.data?.priceUsd ?? "0.00"}`}
                </Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                {watch.data?.reason ?? "Sign in to buy this replay if you missed the live class."}
              </Text>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
