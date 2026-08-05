import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { TransactionHistoryList } from "@/components/transaction-history-list";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";
import { SocialFeedPanel } from "@/components/social-feed-panel";
import { SocialHubTabBar, type SocialHubTab } from "@/components/social-hub-tab-bar";
import { InternetCenterMailPanel } from "@/components/internet-center-mail-panel";
import { brandHighlightSurface } from "@/lib/brand-theme";

type Tab = SocialHubTab;

export function SocialHubPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("feed");
  const [friendEmail, setFriendEmail] = useState("");
  const [creatorUserId, setCreatorUserId] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [mailComposeTo, setMailComposeTo] = useState<string | undefined>();
  const [videoRoomId, setVideoRoomId] = useState<string | null>(null);
  const [videoFriendId, setVideoFriendId] = useState<string | null>(null);
  const [videoIsCaller, setVideoIsCaller] = useState(true);

  const dash = trpc.social.dashboard.useQuery();
  const incomingCalls = trpc.social.incomingVideoCalls.useQuery(undefined, {
    refetchInterval: 5000,
  });
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
    },
  });
  const unsubscribe = trpc.social.unsubscribeCreator.useMutation({
    onSuccess: () => void utils.social.dashboard.invalidate(),
  });
  const rideAlong = trpc.social.setRideAlong.useMutation({
    onSuccess: () => void utils.social.dashboard.invalidate(),
  });

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

      {(incomingCalls.data ?? []).filter((r) => r.status === "ringing").length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
          {(incomingCalls.data ?? [])
            .filter((r) => r.status === "ringing")
            .map((call) => (
              <View
                key={call.id}
                style={[
                  styles.card,
                  {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}15`,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "800" }}>📹 Incoming video call</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    From friend · tap Answer to join
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setVideoRoomId(call.id);
                    setVideoFriendId(call.callerUserId);
                    setVideoIsCaller(false);
                    setTab("mail");
                  }}
                  style={[styles.btn, { backgroundColor: colors.primary, marginTop: 0, paddingVertical: 8, paddingHorizontal: 14 }]}
                >
                  <Text style={styles.btnText}>Answer</Text>
                </Pressable>
              </View>
            ))}
        </View>
      ) : null}

      {videoRoomId && videoFriendId ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <FriendVideoCallPanel
            roomId={videoRoomId}
            friendUserId={videoFriendId}
            isCaller={videoIsCaller}
            onClose={() => {
              setVideoRoomId(null);
              setVideoFriendId(null);
            }}
          />
        </View>
      ) : null}

      {tab === "feed" ? (
        <SocialFeedPanel />
      ) : tab === "mail" ? (
        <InternetCenterMailPanel
          initialComposeTo={mailComposeTo}
          onComposeToConsumed={() => setMailComposeTo(undefined)}
        />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        {tab === "friends" ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Address book</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Add friends by email, then send them mail from the Internet Center.
            </Text>
            <TextInput
              value={friendEmail}
              onChangeText={setFriendEmail}
              placeholder="friend@email.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
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
                <Text style={[styles.title, { color: colors.foreground }]}>Pending requests</Text>
                {pending.map((p) => (
                  <View key={p.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>{p.friendEmail}</Text>
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

            <Text style={[styles.title, { color: colors.foreground }]}>Friends ({friends.length})</Text>
            {friends.length === 0 ? (
              <Text style={{ color: colors.muted }}>No friends yet — invite someone by email.</Text>
            ) : (
              friends.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    setMailComposeTo(f.peerEmail);
                    setTab("mail");
                  }}
                  style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>{f.peerEmail}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Tap to compose mail</Text>
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {tab === "creators" ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Subscribe to creators</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Follow content creators, get notified about live classes, and optionally ride along with
              their AI sessions.
            </Text>
            <TextInput
              value={creatorUserId}
              onChangeText={setCreatorUserId}
              placeholder="Creator user ID"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <TextInput
              value={creatorName}
              onChangeText={setCreatorName}
              placeholder="Creator display name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
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
              <Text style={styles.btnText}>Subscribe</Text>
            </Pressable>

            <Text style={[styles.title, { color: colors.foreground }]}>Your subscriptions</Text>
            {subs.length === 0 ? (
              <Text style={{ color: colors.muted }}>No creator subscriptions yet.</Text>
            ) : (
              subs.map((s) => (
                <View key={s.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>{s.creatorName}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Ride along with AI sessions</Text>
                    <Switch
                      value={s.rideAlongWithAi}
                      onValueChange={(v) =>
                        rideAlong.mutate({ creatorUserId: s.creatorUserId, rideAlongWithAi: v })
                      }
                    />
                  </View>
                  <Pressable
                    onPress={() => unsubscribe.mutate({ creatorUserId: s.creatorUserId })}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Unsubscribe</Text>
                  </Pressable>
                </View>
              ))
            )}

            {subscribers.length > 0 ? (
              <>
                <Text style={[styles.title, { color: colors.foreground }]}>
                  Your subscribers ({subscribers.length})
                </Text>
                {subscribers.map((s) => (
                  <Text key={s.id} style={{ color: colors.muted, fontSize: 12 }}>
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
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>Your UR activity</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>
                Loyalty: {activity.data?.loyaltyPoints ?? 0} pts · Friends:{" "}
                {activity.data?.friendCount ?? 0} · Subscriptions: {activity.data?.subscriptionCount ?? 0}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Transactions: {activity.data?.transactionCount ?? 0} · Volume: $
                {((activity.data?.totalSpentOrEarnedCents ?? 0) / 100).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Recent transactions</Text>
            <TransactionHistoryList
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
