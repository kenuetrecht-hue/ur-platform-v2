import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { ALLOWED_SESSION_DURATIONS, durationLabel } from "@/lib/ai-session-constants";
import { TransactionHistoryList, CustomLinkCard } from "@/components/transaction-history-list";
import { CreatorPayoutSetupPanel } from "@/components/creator-payout-setup-panel";
import { CreatorSocialShareBar, CreatorPromoCard } from "@/components/creator-social-share";
import { CreatorContentMatePanel } from "@/components/creator-contentmate-panel";
import { CreatorStorePanel } from "@/components/creator-store-panel";

type Tab = "overview" | "classes" | "promote" | "store" | "ai";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "classes", label: "Classes", icon: "🎬" },
  { id: "store", label: "Merch Shop", icon: "🛍️" },
  { id: "promote", label: "Promote", icon: "📣" },
  { id: "ai", label: "ContentMate", icon: "✨" },
];

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: accent ?? colors.foreground, fontSize: 20, fontWeight: "800" }}>{value}</Text>
      {sub ? <Text style={{ color: colors.muted, fontSize: 10 }}>{sub}</Text> : null}
    </View>
  );
}

function statusColor(status: string, colors: ReturnType<typeof useColors>) {
  if (status === "live") return "#22c55e";
  if (status === "scheduled") return colors.primary;
  if (status === "cancelled") return colors.muted;
  return colors.muted;
}

function formatStartPreset(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export function ContentCreatorDashboardPanel() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedAi, setSelectedAi] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState<(typeof ALLOWED_SESSION_DURATIONS)[number]>(60);

  const dash = trpc.partnerDashboard.creatorDashboard.useQuery();
  const ais = trpc.partnerDashboard.listAvailableAis.useQuery(undefined, {
    enabled: dash.data?.enrolled === true,
  });
  const classes = trpc.partnerDashboard.listMyClasses.useQuery(undefined, {
    enabled: dash.data?.enrolled === true,
  });

  const enroll = trpc.partnerDashboard.enrollCreator.useMutation({
    onSuccess: () => void utils.partnerDashboard.creatorDashboard.invalidate(),
  });
  const schedule = trpc.partnerDashboard.scheduleMyClass.useMutation({
    onSuccess: () => {
      setTitle("");
      setStartsAt("");
      void utils.partnerDashboard.listMyClasses.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
      setTab("classes");
    },
  });
  const cancelClass = trpc.partnerDashboard.cancelMyClass.useMutation({
    onSuccess: () => {
      void utils.partnerDashboard.listMyClasses.invalidate();
      void utils.partnerDashboard.creatorDashboard.invalidate();
    },
  });

  const timePresets = useMemo(
    () => [
      { label: "Tomorrow 6 PM", iso: formatStartPreset(24 + 6 - new Date().getHours()) },
      { label: "Sat 2 PM", iso: formatStartPreset(48) },
      { label: "Next week", iso: formatStartPreset(168) },
    ],
    [],
  );

  if (dash.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  if (!dash.data?.enrolled) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 28 }}>🎬</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Content Creator Dashboard</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
            Everything you need to host paid live AI classes — scheduling, instant Uphold payouts,
            Facebook promo tools, and ContentMate AI to write your captions.
          </Text>
          <View style={{ gap: 6, marginVertical: 8 }}>
            {[
              "📊 Earnings & analytics dashboard",
              "🎬 Schedule 15–60 min live classes",
              "📣 Share to Facebook & social",
              "✨ ContentMate AI for promo copy",
              "⚡ 85% instant blockchain payouts",
            ].map((item) => (
              <Text key={item} style={{ color: colors.foreground, fontSize: 13 }}>
                {item}
              </Text>
            ))}
          </View>
          <Pressable
            onPress={() => enroll.mutate()}
            disabled={enroll.isPending}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            {enroll.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Become a content creator</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const p = dash.data.profile;
  const link = dash.data.link;
  const analytics = dash.data.analytics;
  const promo = dash.data.promo;
  const recentTransactions = dash.data.recentTransactions ?? [];
  const upcomingClassTitle = promo?.upcomingClassTitle ?? null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[
              styles.tab,
              {
                borderBottomColor: tab === t.id ? colors.primary : "transparent",
                backgroundColor: tab === t.id ? `${colors.primary}10` : "transparent",
              },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{t.icon}</Text>
            <Text
              style={{
                color: tab === t.id ? colors.primary : colors.muted,
                fontWeight: tab === t.id ? "800" : "600",
                fontSize: 12,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {tab === "overview" ? (
          <>
            {link ? (
              <CustomLinkCard customUrl={link.customUrl} slug={link.slug} label="Your creator link" />
            ) : null}
            {promo ? (
              <CreatorSocialShareBar
                compact
                payload={{
                  url: promo.customUrl,
                  shareText: promo.shareText,
                  facebookShareUrl: promo.facebookShareUrl,
                }}
              />
            ) : null}
            <CreatorPayoutSetupPanel />
            {analytics ? (
              <View style={styles.statGrid}>
                <StatCard
                  label="Total earned"
                  value={`$${(analytics.totalEarningsCents / 100).toFixed(2)}`}
                  sub={`${analytics.creatorSharePercent}% creator share`}
                  accent={colors.primary}
                />
                <StatCard
                  label="Last 30 days"
                  value={`$${(analytics.earnings30dCents / 100).toFixed(2)}`}
                  sub={`${analytics.transactionCount} sales`}
                />
                <StatCard
                  label="Classes"
                  value={String(analytics.totalClasses)}
                  sub={`${analytics.upcomingClasses} upcoming`}
                />
                <StatCard
                  label="Tickets sold"
                  value={String(analytics.totalTicketsSold)}
                  sub={`${analytics.fillRatePercent}% fill rate`}
                />
                <StatCard
                  label="Paid out"
                  value={`$${(analytics.totalPaidOutCents / 100).toFixed(2)}`}
                  sub={
                    analytics.pendingPayoutCents > 0
                      ? `$${(analytics.pendingPayoutCents / 100).toFixed(2)} pending`
                      : "Instant via Uphold"
                  }
                />
                <StatCard
                  label="Platform fee"
                  value={`$${(analytics.platformFeeCents / 100).toFixed(2)}`}
                  sub="15% retained"
                />
              </View>
            ) : null}
            <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
              <Text style={[styles.title, { color: colors.foreground }]}>Welcome back, {p.displayName}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                Schedule classes, promote on Facebook, and let ContentMate write your captions.
                Administration is for platform owner only.
              </Text>
            </View>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>Recent transactions</Text>
            <TransactionHistoryList transactions={recentTransactions} />
          </>
        ) : null}

        {tab === "classes" ? (
          <>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
                Schedule a live class
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginVertical: 10 }}
              >
                {(ais.data ?? []).map((ai) => (
                  <Pressable
                    key={ai.creatorAiId}
                    onPress={() => setSelectedAi(ai.creatorAiId)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selectedAi === ai.creatorAiId ? colors.primary : colors.background,
                        borderColor: selectedAi === ai.creatorAiId ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selectedAi === ai.creatorAiId ? "#fff" : colors.foreground,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {ai.creatorName}
                    </Text>
                    <Text
                      style={{
                        color: selectedAi === ai.creatorAiId ? "#fff" : colors.muted,
                        fontSize: 10,
                      }}
                    >
                      ${ai.pricePerMinuteUsd}/min
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {ais.data?.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  No AI specialists enabled yet — platform owner enables them in Administration.
                </Text>
              ) : null}
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>Duration</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {ALLOWED_SESSION_DURATIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDuration(d)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: duration === d ? colors.primary : colors.background,
                        borderColor: duration === d ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: duration === d ? "#fff" : colors.foreground,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {durationLabel(d)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>Quick start times</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {timePresets.map((preset) => (
                  <Pressable
                    key={preset.label}
                    onPress={() => setStartsAt(preset.iso)}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "600" }}>
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Class title (optional)"
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              <TextInput
                value={startsAt}
                onChangeText={setStartsAt}
                placeholder="Start time (ISO) or tap a preset above"
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, marginTop: 8 }]}
              />
              <Pressable
                disabled={!selectedAi || !startsAt || schedule.isPending}
                onPress={() =>
                  schedule.mutate({
                    creatorAiId: selectedAi,
                    startsAt,
                    title: title.trim() || undefined,
                    durationMinutes: duration,
                  })
                }
                style={[
                  styles.btn,
                  {
                    backgroundColor: colors.primary,
                    opacity: !selectedAi || !startsAt ? 0.5 : 1,
                    marginTop: 10,
                  },
                ]}
              >
                {schedule.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Schedule class</Text>
                )}
              </Pressable>
            </View>

            <Text style={{ color: colors.foreground, fontWeight: "700" }}>Your classes</Text>
            {(classes.data ?? []).length === 0 ? (
              <Text style={{ color: colors.muted }}>No classes scheduled yet.</Text>
            ) : (
              classes.data?.map((c) => (
                <View
                  key={c.id}
                  style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "700" }}>{c.title}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {c.creatorName} · {new Date(c.startsAt).toLocaleString()} ·{" "}
                        {c.committedDurationMinutes} min
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        ${(c.priceCents / 100).toFixed(2)} ticket · {c.attendeeCount}/{c.maxAttendees} sold
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusColor(c.status, colors)}20` },
                      ]}
                    >
                      <Text
                        style={{
                          color: statusColor(c.status, colors),
                          fontSize: 10,
                          fontWeight: "800",
                          textTransform: "uppercase",
                        }}
                      >
                        {c.status}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {(c.status === "scheduled" || c.status === "live") && (
                      <Pressable
                        onPress={() => router.push(`/live-session/${c.id}`)}
                        style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.smallBtnText}>
                          {c.status === "live" ? "Go live" : "Host lobby"}
                        </Text>
                      </Pressable>
                    )}
                    {c.status === "scheduled" && (
                      <Pressable
                        onPress={() =>
                          Alert.alert("Cancel class?", "Attendees who bought tickets will need a refund.", [
                            { text: "Keep", style: "cancel" },
                            {
                              text: "Cancel class",
                              style: "destructive",
                              onPress: () => cancelClass.mutate({ sessionId: c.id }),
                            },
                          ])
                        }
                        style={[styles.smallBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                      >
                        <Text style={[styles.smallBtnText, { color: colors.foreground }]}>Cancel</Text>
                      </Pressable>
                    )}
                    <ClassShareButton sessionId={c.id} title={c.title} />
                    <Pressable
                      onPress={() => {
                        setTab("ai");
                      }}
                      style={[styles.smallBtn, { backgroundColor: `${colors.primary}18` }]}
                    >
                      <Text style={[styles.smallBtnText, { color: colors.primary }]}>Ask ContentMate</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === "store" ? (
          <CreatorStorePanel />
        ) : null}

        {tab === "promote" ? (
          <>
            {promo ? (
              <CreatorPromoCard
                shareText={promo.shareText}
                facebookPost={promo.facebookPost}
                customUrl={promo.customUrl}
                facebookShareUrl={promo.facebookShareUrl}
                label={
                  upcomingClassTitle
                    ? `Promote: ${upcomingClassTitle}`
                    : "Promote your creator page"
                }
              />
            ) : null}
            {link ? (
              <CustomLinkCard customUrl={link.customUrl} slug={link.slug} label="Your tracked link" />
            ) : null}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>Promotion tips</Text>
              {[
                "Post your Facebook promo 2–3 days before each class",
                "Share your creator link in your bio and stories",
                "Ask ContentMate to write hook lines and captions",
                "Every sale through your link is tracked automatically",
              ].map((tip) => (
                <Text key={tip} style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
                  · {tip}
                </Text>
              ))}
              <Pressable
                onPress={() => setTab("ai")}
                style={[styles.btn, { backgroundColor: colors.primary, marginTop: 8 }]}
              >
                <Text style={styles.btnText}>Open ContentMate for promo copy</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {tab === "ai" ? (
          <CreatorContentMatePanel
            creatorName={p.displayName}
            upcomingClassTitle={upcomingClassTitle}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function ClassShareButton({ sessionId, title }: { sessionId: string; title: string }) {
  const share = trpc.partnerDashboard.classSharePayload.useQuery(
    { sessionId },
    { enabled: false },
  );

  const handleShare = async () => {
    const result = await share.refetch();
    if (!result.data) return;
    const { classUrl, shareText } = result.data;
    await Share.share({
      message: `${shareText}\n\n${classUrl}`,
      url: classUrl,
      title,
    });
  };

  return (
    <Pressable
      onPress={() => void handleShare()}
      style={[styles.smallBtn, { backgroundColor: "#1877F2" }]}
    >
      <Text style={styles.smallBtnText}>Share</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: { paddingHorizontal: 8, gap: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderRadius: 8,
  },
  banner: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8, alignItems: "stretch" },
  title: { fontSize: 18, fontWeight: "800" },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  smallBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    width: "47%",
    flexGrow: 1,
  },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
});
