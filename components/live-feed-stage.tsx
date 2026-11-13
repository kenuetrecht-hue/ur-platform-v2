import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { MuxVideoPlayer } from "@/components/mux-video-player";
import { LiveFeedInterview } from "@/components/live-feed-interview";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { useBillingState } from "@/hooks/use-billing-state";
import { getClientPlatform, openExternalCheckoutUrl } from "@/lib/web-checkout";

type Props = {
  feedId: string;
  guestToken?: string;
};

function absolutePath(path: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

export function LiveFeedStage({ feedId, guestToken }: Props) {
  const colors = useColors();
  const { user } = useAuth();
  const myUserId = user?.id != null ? String(user.id) : "";
  const utils = trpc.useUtils();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const [guestReady, setGuestReady] = useState(!guestToken);
  const [linkNote, setLinkNote] = useState<string | null>(null);
  const redeem = trpc.liveFeed.redeemCoHost.useMutation();
  const feed = trpc.liveFeed.get.useQuery({ feedId }, { enabled: guestReady, refetchInterval: 5_000 });
  const watch = trpc.liveFeed.watch.useQuery(
    { feedId },
    { enabled: guestReady && Boolean(feed.data?.canWatch), refetchInterval: 8_000 },
  );
  const invite = trpc.liveFeed.inviteCoHost.useMutation();
  const startPicture = trpc.liveFeed.startBroadcast.useMutation();
  const end = trpc.liveFeed.end.useMutation({
    onSuccess: () => void utils.liveFeed.get.invalidate({ feedId }),
  });
  const pay = trpc.liveFeed.pay.useMutation({
    onSuccess: (result) => {
      if ("checkoutUrl" in result && result.checkoutUrl) {
        void openExternalCheckoutUrl(result.checkoutUrl);
        return;
      }
      void utils.liveFeed.get.invalidate({ feedId });
    },
  });

  useEffect(() => {
    if (!guestToken || guestReady) return;
    let cancelled = false;
    redeem.mutate(
      { token: guestToken },
      {
        onSettled: () => {
          if (!cancelled) setGuestReady(true);
        },
      },
    );
    return () => {
      cancelled = true;
    };
    // Redeem the invite once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestToken]);

  if (!guestReady || feed.isLoading || !feed.data) {
    return <ActivityIndicator color={colors.primary} />;
  }

  const data = feed.data;
  const isHost = data.role === "host";
  const isSpeaker = data.role === "host" || data.role === "cohost";
  const peers = (data.speakers ?? []).filter((speaker) => speaker.userId !== myUserId);
  const playback = watch.data?.playback;

  return (
    <View style={{ gap: 12 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>{data.title}</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {data.hostName} · {data.access === "free" ? "Free live feed" : "Paid live feed"} ·{" "}
        {data.status === "live" ? "Live" : "Ended"}
      </Text>
      {data.needsPayment ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
            This live feed is paid. The ticket is ${(data.priceCents / 100).toFixed(2)}. Pay to come inside.
          </Text>
          <BillingStatePicker value={stateCode} onChange={setStateCode} />
          <Pressable
            disabled={pay.isPending || !hasState}
            onPress={() =>
              pay.mutate({
                feedId,
                clientPlatform: getClientPlatform(),
                billingStateCode: stateCode ?? undefined,
              })
            }
            style={[styles.btn, { backgroundColor: colors.primary, opacity: hasState ? 1 : 0.5 }]}
          >
            <Text style={styles.btnText}>{pay.isPending ? "Opening checkout…" : "Pay and join"}</Text>
          </Pressable>
          {pay.error ? <Text style={styles.error}>{pay.error.message}</Text> : null}
        </View>
      ) : null}
      {data.canWatch ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {playback ? (
            <MuxVideoPlayer playbackId={playback.playbackId} token={playback.token} />
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              {watch.data?.locked
                ? "The live picture is locked until playback signing is turned on."
                : "The live picture has not started. Stay on this page."}
            </Text>
          )}
          {data.cohosts.length > 0 ? (
            <Text style={{ color: colors.foreground, fontSize: 13 }}>
              On the interview: {data.cohosts.map((cohost) => cohost.name).join(", ")}
            </Text>
          ) : null}
        </View>
      ) : null}
      {isSpeaker && data.status === "live" ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Interview</Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
            You and up to four co-hosts can see and hear each other here. Everyone else watches the live picture.
          </Text>
          <LiveFeedInterview feedId={feedId} myUserId={myUserId} peers={peers} />
        </View>
      ) : null}
      {isHost && data.status === "live" ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>
            {data.access === "free"
              ? "Anyone who is signed in can open the watch link and join."
              : "The watch link opens the ticket page. They pay, then they come inside."}
          </Text>
          <Text selectable style={{ color: colors.foreground, fontSize: 12 }}>
            {absolutePath(data.watchPath)}
          </Text>
          <Pressable
            onPress={() => startPicture.mutate({ feedId })}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.btnText}>
              {startPicture.isPending ? "Starting…" : "Start the live picture"}
            </Text>
          </Pressable>
          {startPicture.data ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Server</Text>
              <Text selectable style={{ color: colors.foreground, fontSize: 12 }}>{startPicture.data.rtmpUrl}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Stream key — only you should see this</Text>
              <Text selectable style={{ color: colors.foreground, fontSize: 12 }}>{startPicture.data.streamKey}</Text>
            </View>
          ) : null}
          {startPicture.error ? <Text style={styles.error}>{startPicture.error.message}</Text> : null}
          <Pressable
            onPress={() =>
              invite.mutate(
                { feedId },
                { onSuccess: (result) => setLinkNote(absolutePath(result.guestPath)) },
              )
            }
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.btnText}>Make a co-host link</Text>
          </Pressable>
          {linkNote ? (
            <Text selectable style={{ color: colors.foreground, fontSize: 12 }}>
              {linkNote}
            </Text>
          ) : null}
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            Send that link to one person. It works once. You can have four co-hosts.
          </Text>
          {invite.error ? <Text style={styles.error}>{invite.error.message}</Text> : null}
          <Pressable onPress={() => end.mutate({ feedId })} style={[styles.btn, { backgroundColor: "#7f1d1d" }]}>
            <Text style={styles.btnText}>End the live feed</Text>
          </Pressable>
        </View>
      ) : null}
      {redeem.error && !data.canWatch ? <Text style={styles.error}>{redeem.error.message}</Text> : null}
      {feed.error ? <Text style={styles.error}>{feed.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", fontSize: 18 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  error: { color: "#e74c3c", fontSize: 12 },
});
