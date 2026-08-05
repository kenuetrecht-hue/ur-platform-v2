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
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import { TransactionHistoryList } from "@/components/transaction-history-list";
import { FriendVideoCallPanel } from "@/components/friend-video-call-panel";
import { SocialFeedPanel } from "@/components/social-feed-panel";

type Tab = "feed" | "friends" | "messages" | "creators" | "activity";

export function SocialHubPanel() {
  const colors = useColors();
  const { user } = useAuth();
  const myUserId = user?.id != null ? String(user.id) : "";
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("feed");
  const [friendEmail, setFriendEmail] = useState("");
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [creatorUserId, setCreatorUserId] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [videoRoomId, setVideoRoomId] = useState<string | null>(null);
  const [videoIsCaller, setVideoIsCaller] = useState(true);

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
  const sendMsg = trpc.social.sendMessage.useMutation({
    onSuccess: () => {
      setMessageBody("");
      void utils.social.listMessages.invalidate();
      void utils.social.dashboard.invalidate();
    },
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
  const startVideo = trpc.social.createVideoCall.useMutation({
    onSuccess: (room) => {
      setVideoRoomId(room.id);
      setVideoIsCaller(true);
    },
  });

  const threadMessages = trpc.social.listMessages.useQuery(
    { withUserId: chatWith ?? "" },
    { enabled: Boolean(chatWith) },
  );

  if (dash.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  const friends = dash.data?.friends ?? [];
  const pending = dash.data?.pendingRequests ?? [];
  const subs = dash.data?.subscriptions ?? [];
  const subscribers = dash.data?.subscribers ?? [];

  const peerLabel = (userId: string) =>
    friends.find((f) => f.peerUserId === userId)?.peerEmail ?? `User ${userId.slice(0, 8)}…`;

  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "Feed" },
    { id: "friends", label: "Friends" },
    { id: "messages", label: "Messages" },
    { id: "creators", label: "Creators" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              setTab(t.id);
              if (t.id !== "messages") setChatWith(null);
            }}
            style={[
              styles.tab,
              {
                backgroundColor: tab === t.id ? colors.primary : colors.surface,
                borderColor: tab === t.id ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ color: tab === t.id ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "feed" ? (
        <SocialFeedPanel />
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        {tab === "friends" ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Add friends</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Like Facebook — connect with people on UR Platform by email.
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
                    setChatWith(f.peerUserId);
                    setTab("messages");
                  }}
                  style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>{f.peerEmail}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Tap to message</Text>
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {tab === "messages" ? (
          <>
            {!chatWith ? (
              <>
                <Text style={[styles.title, { color: colors.foreground }]}>Conversations</Text>
                {(dash.data?.threads ?? []).length === 0 ? (
                  <Text style={{ color: colors.muted }}>Message a friend from the Friends tab.</Text>
                ) : (
                  dash.data?.threads.map((t) => (
                    <Pressable
                      key={t.withUserId}
                      onPress={() => setChatWith(t.withUserId)}
                      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: "700" }}>{peerLabel(t.withUserId)}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                        {t.lastMessage.body}
                      </Text>
                      {t.unreadCount > 0 ? (
                        <Text style={{ color: colors.primary, fontSize: 11 }}>{t.unreadCount} unread</Text>
                      ) : null}
                    </Pressable>
                  ))
                )}
              </>
            ) : (
              <>
                <Pressable onPress={() => setChatWith(null)}>
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>← Back</Text>
                </Pressable>
                {videoRoomId ? (
                  <FriendVideoCallPanel
                    roomId={videoRoomId}
                    friendUserId={chatWith}
                    isCaller={videoIsCaller}
                    onClose={() => setVideoRoomId(null)}
                  />
                ) : (
                  <Pressable
                    onPress={() => startVideo.mutate({ friendUserId: chatWith })}
                    disabled={startVideo.isPending}
                    style={[styles.btn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.btnText}>
                      {startVideo.isPending ? "Starting…" : "📹 Video chat"}
                    </Text>
                  </Pressable>
                )}
                {(threadMessages.data ?? []).map((m) => {
                  const isMine = m.senderUserId === myUserId;
                  return (
                  <View
                    key={m.id}
                    style={{
                      alignSelf: isMine ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      backgroundColor: isMine ? colors.primary : colors.surface,
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: isMine ? "#fff" : colors.foreground }}>{m.body}</Text>
                  </View>
                  );
                })}
                <TextInput
                  value={messageBody}
                  onChangeText={setMessageBody}
                  placeholder="Type a message…"
                  placeholderTextColor={colors.muted}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                />
                <Pressable
                  disabled={!messageBody.trim() || sendMsg.isPending}
                  onPress={() =>
                    sendMsg.mutate({ recipientUserId: chatWith, body: messageBody.trim() })
                  }
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.btnText}>Send</Text>
                </Pressable>
              </>
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
            <View style={[styles.card, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
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
  tabRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  title: { fontSize: 16, fontWeight: "800" },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
});
