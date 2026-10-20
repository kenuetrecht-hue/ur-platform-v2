import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { TransactionHistoryList } from "@/components/transaction-history-list";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";
import { SocialFeedPanel } from "@/components/social-feed-panel";
import { SocialHubTabBar, type SocialHubTab } from "@/components/social-hub-tab-bar";
import { InternetCenterMailPanel } from "@/components/internet-center-mail-panel";
import { CreatorTipButton } from "@/components/creator-tip-button";
import { CreatorCallButton } from "@/components/creator-call-button";
import { brandHighlightSurface } from "@/lib/brand-theme";
import { subscribeCallRing } from "@/lib/call-ring-client";
import { CREATOR_CHANNEL_CENTS, formatSocialUsd } from "@/lib/social-money";

type Tab = SocialHubTab;

export function SocialHubPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("feed");
  const [friendEmail, setFriendEmail] = useState("");
  const [creatorUserId, setCreatorUserId] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [billingState, setBillingState] = useState("");
  const [mailComposeTo, setMailComposeTo] = useState<string | undefined>();
  const [videoRoomId, setVideoRoomId] = useState<string | null>(null);
  const [videoFriendId, setVideoFriendId] = useState<string | null>(null);
  const [videoPeerLabel, setVideoPeerLabel] = useState("");
  const [callingPeerId, setCallingPeerId] = useState<string | null>(null);
  const [videoIsCaller, setVideoIsCaller] = useState(true);
  const [ringNote, setRingNote] = useState<string | null>(null);
  const ringKey = trpc.social.callRingPublicKey.useQuery(undefined, { staleTime: 60_000 });
  const registerRing = trpc.social.registerCallRing.useMutation();
  const params = useLocalSearchParams<{ creatorCall?: string; creator?: string }>();
  const startedPaidCall = useRef<string | null>(null);

  const dash = trpc.social.dashboard.useQuery();
  const activity = trpc.social.myActivitySummary.useQuery();
  const txs = trpc.partnerDashboard.myTransactions.useQuery({ limit: 15 });

  const addFriend = trpc.social.sendFriendRequest.useMutation({
    onSuccess: () => {
      setFriendEmail("");
      void utils.social.dashboard.invalidate();
    },
  });
  const acceptFriend = trpc.social.acceptFriendRequest.useMutation({
    onSuccess: () => void utils.social.dashboard.invalidate(),
  });
  const subscribe = trpc.social.subscribeCreator.useMutation({
    onSuccess: () => {
      setCreatorUserId("");
      setCreatorName("");
      void utils.social.dashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const unsubscribe = trpc.social.unsubscribeCreator.useMutation({
    onSuccess: () => {
      void utils.social.dashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const follow = trpc.social.followCreator.useMutation({
    onSuccess: () => {
      void utils.social.dashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const unfollow = trpc.social.unfollowCreator.useMutation({
    onSuccess: () => {
      void utils.social.dashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const paidSub = trpc.social.subscribePaidChannel.useMutation({
    onSuccess: (result) => {
      const checkoutUrl = "checkoutUrl" in result ? result.checkoutUrl : "";
      if (checkoutUrl) {
        if (Platform.OS === "web" && typeof window !== "undefined") window.location.assign(checkoutUrl);
        else void Linking.openURL(checkoutUrl);
        return;
      }
      void utils.social.dashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const loyalty = trpc.loyalty.getStatus.useQuery();
  const cancelPaid = trpc.social.cancelPaidChannel.useMutation({
    onSuccess: () => {
      void utils.social.dashboard.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });
  const rideAlong = trpc.social.setRideAlong.useMutation({
    onSuccess: () => void utils.social.dashboard.invalidate(),
  });
  const incomingCalls = trpc.social.incomingVideoCalls.useQuery(undefined, {
    refetchInterval: 1500,
    staleTime: 0,
  });
  const startFriendCall = trpc.social.createVideoCall.useMutation({
    onSuccess: (room, variables) => {
      setCallingPeerId(null);
      setVideoRoomId(room.id);
      setVideoFriendId(variables.friendUserId);
      setVideoIsCaller(true);
    },
    onError: () => setCallingPeerId(null),
  });
  const startPaidCreatorCall = trpc.social.startCreatorCall.useMutation({
    onSuccess: (room, variables) => {
      setVideoRoomId(room.id);
      setVideoFriendId(variables.creatorUserId);
      setVideoIsCaller(true);
    },
  });

  useEffect(() => {
    const creatorId = typeof params.creator === "string" ? params.creator : "";
    if (params.creatorCall !== "paid" || !creatorId) return;
    if (startedPaidCall.current === creatorId) return;
    startedPaidCall.current = creatorId;
    startPaidCreatorCall.mutate({ creatorUserId: creatorId });
  }, [params.creatorCall, params.creator]);

  const openCall = (roomId: string, peerUserId: string, asCaller: boolean) => {
    setVideoRoomId(roomId);
    setVideoFriendId(peerUserId);
    setVideoIsCaller(asCaller);
  };

  if (dash.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  const friends = dash.data?.friends ?? [];
  const pending = dash.data?.pendingRequests ?? [];
  const subs = dash.data?.subscriptions ?? [];
  const subscribers = dash.data?.subscribers ?? [];

  const unreadMail = dash.data?.unreadMailCount ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <SocialHubTabBar
        active={tab}
        onChange={setTab}
        messageBadge={unreadMail}
        pendingFriends={pending.length}
      />
      <Pressable
        onPress={() => {
          const publicKey = ringKey.data?.publicKey ?? "";
          void subscribeCallRing({
            publicKey,
            register: (subscription) => registerRing.mutateAsync(subscription),
          }).then((ok) => {
            setRingNote(
              ok
                ? "This phone will ring when someone calls you on UR Platform, even if you are signed out."
                : "Tap Allow when the phone asks. On an iPhone, add UR to the home screen first, then allow notifications.",
            );
          });
        }}
        style={[styles.btn, { backgroundColor: "#111827", marginHorizontal: 16, marginTop: 8 }]}
      >
        <Text style={styles.btnText}>Let this phone ring for calls</Text>
      </Pressable>
      <Text style={{ color: colors.gold, fontSize: 12, lineHeight: 18, marginHorizontal: 16, marginTop: 6 }}>
        {loyalty.data
          ? `${loyalty.data.currentStreakDays} days in a row on UR`
          : "Your visit streak shows here after you sign in."}
      </Text>
      {ringNote ? (
        <Text style={{ color: colors.gold, fontSize: 12, lineHeight: 18, marginHorizontal: 16, marginTop: 6 }}>
          {ringNote}
        </Text>
      ) : null}
      {(incomingCalls.data ?? [])
        .filter((call) => call.status === "ringing")
        .map((call) => (
          <Pressable
            key={call.id}
            onPress={() => openCall(call.id, call.callerUserId, false)}
            style={[styles.btn, { backgroundColor: "#1e8e3e", marginHorizontal: 16, marginTop: 12 }]}
          >
            <Text style={styles.btnText}>Answer {call.callerName || "a friend"}</Text>
          </Pressable>
        ))}

      {videoRoomId && videoFriendId ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <FriendVideoCallPanel
            roomId={videoRoomId}
            friendUserId={videoFriendId}
            peerLabel={videoPeerLabel}
            isCaller={videoIsCaller}
            onClose={() => {
              setVideoRoomId(null);
              setVideoFriendId(null);
              setVideoPeerLabel("");
              setCallingPeerId(null);
            }}
          />
        </View>
      ) : null}

      {tab === "feed" ? (
        <SocialFeedPanel onCallStarted={(roomId, creatorId) => openCall(roomId, creatorId, true)} />
      ) : tab === "mail" ? (
        <InternetCenterMailPanel
          initialComposeTo={mailComposeTo}
          onComposeToConsumed={() => setMailComposeTo(undefined)}
        />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        {tab === "friends" ? (
          <>
            <Text style={[styles.title, { color: colors.gold }]}>Address book</Text>
            <Text style={{ color: colors.gold, fontSize: 12 }}>
              Add friends by email, then send them mail from the Internet Center.
            </Text>
            <TextInput
              value={friendEmail}
              onChangeText={setFriendEmail}
              placeholder="friend@email.com"
              placeholderTextColor={colors.gold}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { borderColor: colors.border, color: colors.gold, backgroundColor: "transparent" }]}
            />
            <Pressable
              disabled={!friendEmail.includes("@") || addFriend.isPending}
              onPress={() => addFriend.mutate({ friendEmail: friendEmail.trim() })}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnText}>Send friend request</Text>
            </Pressable>

            {pending.length > 0 ? (
              <>
                <Text style={[styles.title, { color: colors.gold }]}>Pending requests</Text>
                {pending.map((p) => (
                  <View key={p.id} style={[styles.card, { borderColor: colors.border, backgroundColor: "transparent" }]}>
                    <Text style={{ color: colors.gold, fontWeight: "700" }}>{p.friendEmail}</Text>
                    <Pressable
                      onPress={() => acceptFriend.mutate({ friendshipId: p.id })}
                      style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]}
                    >
                      <Text style={styles.btnText}>Accept</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            ) : null}

            <Text style={[styles.title, { color: colors.gold }]}>Friends ({friends.length})</Text>
            {startFriendCall.error ? (
              <Text style={{ color: "#c0392b", fontSize: 13, lineHeight: 18 }}>
                {startFriendCall.error.message}
              </Text>
            ) : null}
            {friends.length === 0 ? (
              <Text style={{ color: colors.gold }}>No friends yet — invite someone by email.</Text>
            ) : (
              friends.map((f) => (
                <View
                  key={f.id}
                  style={[styles.card, { borderColor: colors.border, backgroundColor: "transparent" }]}
                >
                  <Pressable
                    onPress={() => {
                      setMailComposeTo(f.peerEmail);
                      setTab("mail");
                    }}
                  >
                    <Text style={{ color: colors.gold, fontWeight: "700" }}>{f.peerEmail}</Text>
                    <Text style={{ color: colors.gold, fontSize: 11 }}>Tap name to compose mail</Text>
                  </Pressable>
                  <Pressable
                    disabled={startFriendCall.isPending || Boolean(videoRoomId)}
                    onPress={() => {
                      setCallingPeerId(f.peerUserId);
                      setVideoPeerLabel(f.peerName || f.peerEmail);
                      startFriendCall.mutate({ friendUserId: f.peerUserId });
                    }}
                    style={[styles.btn, { backgroundColor: colors.primary, marginTop: 10, opacity: startFriendCall.isPending && callingPeerId !== f.peerUserId ? 0.45 : 1 }]}
                  >
                    <Text style={styles.btnText}>
                      {callingPeerId === f.peerUserId && startFriendCall.isPending
                        ? `Calling ${f.peerName || "them"}…`
                        : "Video call"}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === "creators" ? (
          <>
            <Text style={[styles.title, { color: colors.gold }]}>Follow or subscribe</Text>
            <Text style={{ color: colors.gold, fontSize: 12, lineHeight: 18 }}>
              Follow is free. A paid follow is {formatSocialUsd(CREATOR_CHANNEL_CENTS)} for 30 days.
              The creator keeps 85%. UR keeps 15%. Tax and the card fee are extra. Paid members get a
              member badge, members-only posts, and this week's face looks. No refunds.
            </Text>
            <TextInput
              value={creatorUserId}
              onChangeText={setCreatorUserId}
              placeholder="Creator user ID"
              placeholderTextColor={colors.gold}
              style={[styles.input, { borderColor: colors.border, color: colors.gold, backgroundColor: "transparent" }]}
            />
            <TextInput
              value={creatorName}
              onChangeText={setCreatorName}
              placeholder="Creator display name"
              placeholderTextColor={colors.gold}
              style={[styles.input, { borderColor: colors.border, color: colors.gold, backgroundColor: "transparent" }]}
            />
            <Pressable
              disabled={!creatorUserId.trim() || follow.isPending}
              onPress={() => follow.mutate({ creatorUserId: creatorUserId.trim() })}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnText}>Follow (free)</Text>
            </Pressable>
            <TextInput
              value={billingState}
              onChangeText={(value) => setBillingState(value.toUpperCase().slice(0, 2))}
              placeholder="Billing state, like IN"
              placeholderTextColor={colors.gold}
              autoCapitalize="characters"
              maxLength={2}
              style={[styles.input, { borderColor: colors.border, color: colors.gold, backgroundColor: "transparent" }]}
            />
            <Pressable
              disabled={!creatorUserId.trim() || paidSub.isPending}
              onPress={() =>
                paidSub.mutate({
                  creatorUserId: creatorUserId.trim(),
                  clientPlatform: Platform.OS === "web" ? "web" : "native",
                  acceptedNoRefund: true,
                  billingStateCode: billingState.trim().length === 2 ? billingState.trim() : undefined,
                })
              }
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnText}>Paid follow · {formatSocialUsd(CREATOR_CHANNEL_CENTS)} / 30 days</Text>
            </Pressable>
            <Pressable
              disabled={!creatorUserId.trim() || !creatorName.trim() || subscribe.isPending}
              onPress={() =>
                subscribe.mutate({
                  creatorUserId: creatorUserId.trim(),
                  creatorName: creatorName.trim(),
                  rideAlongWithAi: false,
                })
              }
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.btnText}>Follow + class notifications</Text>
            </Pressable>

            <Text style={[styles.title, { color: colors.gold }]}>Your subscriptions</Text>
            {subs.length === 0 ? (
              <Text style={{ color: colors.gold }}>No creator subscriptions yet.</Text>
            ) : (
              subs.map((s) => (
                <View key={s.id} style={[styles.card, { borderColor: colors.border, backgroundColor: "transparent" }]}>
                  <Text style={{ color: colors.gold, fontWeight: "700" }}>{s.creatorName}</Text>
                  <CreatorTipButton creatorUserId={s.creatorUserId} creatorName={s.creatorName} labelColor={colors.gold} />
                  <CreatorCallButton
                    creatorUserId={s.creatorUserId}
                    creatorName={s.creatorName}
                    labelColor={colors.gold}
                    onCallStarted={(roomId, creatorId) => openCall(roomId, creatorId, true)}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ color: colors.gold, fontSize: 12 }}>Ride along with AI sessions</Text>
                    <Switch
                      value={s.rideAlongWithAi}
                      onValueChange={(v) =>
                        rideAlong.mutate({ creatorUserId: s.creatorUserId, rideAlongWithAi: v })
                      }
                    />
                  </View>
                  <Pressable
                    onPress={() => paidSub.mutate({ creatorUserId: s.creatorUserId })}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "700" }}>
                      Paid subscribe to this channel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => cancelPaid.mutate({ creatorUserId: s.creatorUserId })}
                    style={{ marginTop: 6 }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 12 }}>Cancel paid subscription</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void unfollow.mutate({ creatorUserId: s.creatorUserId });
                      unsubscribe.mutate({ creatorUserId: s.creatorUserId });
                    }}
                    style={{ marginTop: 6 }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 12 }}>Unfollow / unsubscribe</Text>
                  </Pressable>
                </View>
              ))
            )}

            {subscribers.length > 0 ? (
              <>
                <Text style={[styles.title, { color: colors.gold }]}>
                  Your subscribers ({subscribers.length})
                </Text>
                {subscribers.map((s) => (
                  <Text key={s.id} style={{ color: colors.gold, fontSize: 12 }}>
                    Subscriber {s.subscriberUserId.slice(0, 8)}…
                    {s.rideAlongWithAi ? " · ride-along ON" : ""}
                  </Text>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {tab === "activity" ? (
          <>
            <View
              style={[
                styles.card,
                brandHighlightSurface(colors),
              ]}
            >
              <Text style={{ color: colors.gold, fontWeight: "800" }}>Your UR activity</Text>
              <Text style={{ color: colors.gold, fontSize: 13, marginTop: 6 }}>
                Loyalty: {activity.data?.loyaltyPoints ?? 0} pts · Friends:{" "}
                {activity.data?.friendCount ?? 0} · Subscriptions: {activity.data?.subscriptionCount ?? 0}
              </Text>
              <Text style={{ color: colors.gold, fontSize: 13 }}>
                Transactions: {activity.data?.transactionCount ?? 0} · Volume: $
                {((activity.data?.totalSpentOrEarnedCents ?? 0) / 100).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.gold }]}>Recent transactions</Text>
            <TransactionHistoryList
              onWash
              transactions={(txs.data?.transactions ?? []).map((t) => ({
                id: t.id,
                type: t.type,
                description: t.description,
                amountUsd: t.amountUsd,
                status: t.status,
                createdAtLabel: t.createdAtLabel,
                attributionSlug: t.attributionSlug,
              }))}
            />
          </>
        ) : null}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "800" },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
});
