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
import {
  ALLOWED_SESSION_DURATIONS,
  CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  GROUP_APPOINTMENT_MIN_ATTENDEES,
  GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
  GROUP_APPOINTMENT_PRICE_CENTS_PER_MINUTE,
  MAX_SESSION_ATTENDEES,
  SESSION_CAPACITY_PRESETS,
  computeSessionTicketCents,
  durationLabel,
  type LiveClassPricingTier,
} from "@/lib/ai-session-constants";
import { TransactionHistoryList, CustomLinkCard } from "@/components/transaction-history-list";
import { CreatorPayoutSetupPanel } from "@/components/creator-payout-setup-panel";
import { CreatorSocialShareBar, CreatorPromoCard } from "@/components/creator-social-share";
import { CreatorContentMatePanel } from "@/components/creator-contentmate-panel";
import { CreatorContentProtectionPanel } from "@/components/creator-content-protection-panel";
import { MuxVideoUploader } from "@/components/mux-video-uploader";
import { FOUNDING_AUDIENCE_YEAR_RULE } from "@/lib/founding-audience-year-discount";
import { CREATOR_AUDIENCE_FOLLOW_RULE } from "@/lib/creator-audience-policy";

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
  const [maxAttendees, setMaxAttendees] = useState("5000");
  const [minAttendees, setMinAttendees] = useState("5");
  const [pricingTier, setPricingTier] = useState<LiveClassPricingTier>("standard");
  const [pricePerMin, setPricePerMin] = useState("0.20");
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
  const [replayPrice, setReplayPrice] = useState("4.99");
  const [replayVideoUrl, setReplayVideoUrl] = useState("");
  const [replayMuxUploadId, setReplayMuxUploadId] = useState<string | undefined>();

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
  const publishReplay = trpc.aiLiveSessions.publishReplay.useMutation({
    onSuccess: () => {
      setReplaySessionId(null);
      void utils.partnerDashboard.listMyClasses.invalidate();
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
              "⚡ 85% on classes & merch · 100% of tips (fan pays the card fee)",
              "🎯 2,000 different people in the 30-day launch (1,000 followers + 1,000 paid subs): a full year of 50% off after your launch deal",
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
            {dash.data.payoutStatus ? (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>
                  Referral fee for the person who brought you
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
                  {dash.data.payoutStatus}
                </Text>
              </View>
            ) : null}
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
            <CreatorContentProtectionPanel />
            {analytics ? (
              <View style={styles.statGrid}>
                <StatCard
                  label="Total earned"
                  value={`$${(analytics.totalEarningsCents / 100).toFixed(2)}`}
                  sub={`Classes ${analytics.creatorSharePercent}% · tips 100%`}
                  accent={colors.primary}
                />
                <StatCard
                  label="Tips received"
                  value={`$${((analytics.totalTipCents ?? 0) / 100).toFixed(2)}`}
                  sub="You keep 100% · fan pays card fee"
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
                  sub={`${100 - analytics.creatorSharePercent}% on classes · $0 on tips`}
                />
                <StatCard
                  label="Followers"
                  value={(dash.data.audience?.followerCount ?? p.broughtFollowerCount).toLocaleString()}
                  sub="Live count · fans follow you"
                />
                <StatCard
                  label="Paid subscribers"
                  value={(dash.data.audience?.paidSubscriberCount ?? p.paidChannelSubscriberCount).toLocaleString()}
                  sub="Live count · they can cancel"
                />
              </View>
            ) : null}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
                Your audience
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "900" }}>
                {(dash.data.audience?.followerCount ?? p.broughtFollowerCount).toLocaleString()}
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}> followers</Text>
              </Text>
              {(dash.data.audience?.followers ?? []).length > 0 ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                  {(dash.data.audience?.followers ?? [])
                    .slice(0, 20)
                    .map((f) => (f.userId.length <= 14 ? f.userId : `${f.userId.slice(0, 12)}…`))
                    .join(" · ")}
                  {(dash.data.audience?.followers.length ?? 0) > 20 ? " · …" : ""}
                </Text>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 12 }}>No followers yet</Text>
              )}
              <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "900" }}>
                {(dash.data.audience?.paidSubscriberCount ?? p.paidChannelSubscriberCount).toLocaleString()}
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.muted }}> paid subscribers</Text>
              </Text>
              {(dash.data.audience?.paidSubscribers ?? []).length > 0 ? (
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                  {(dash.data.audience?.paidSubscribers ?? [])
                    .slice(0, 20)
                    .map((s) => (s.userId.length <= 14 ? s.userId : `${s.userId.slice(0, 12)}…`))
                    .join(" · ")}
                  {(dash.data.audience?.paidSubscribers.length ?? 0) > 20 ? " · …" : ""}
                </Text>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 12 }}>No paid subscribers yet</Text>
              )}
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                {dash.data.audienceRule ?? CREATOR_AUDIENCE_FOLLOW_RULE}
              </Text>
              {dash.data.foundingAudience ? (
                <>
                  <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13, marginTop: 6 }}>
                    Founding audience year
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                    {dash.data.foundingAudienceRule ?? FOUNDING_AUDIENCE_YEAR_RULE}
                  </Text>
                  <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, fontWeight: "600" }}>
                    {dash.data.foundingAudience.summary}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
                    Launch offer progress:{" "}
                    {(dash.data.audience?.qualifying?.freeFollowerCount ?? 0).toLocaleString()} / 1,000
                    followers · {(dash.data.audience?.qualifying?.paidSubscriberCount ?? 0).toLocaleString()}{" "}
                    / 1,000 paid · {(dash.data.audience?.qualifying?.uniquePeopleCount ?? 0).toLocaleString()}{" "}
                    / 2,000 different people
                  </Text>
                </>
              ) : null}
            </View>
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
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
                Standard: $0.20/min minimum, flexible group size. Group appointment: $0.01/min
                minimum (charge $0.02, $0.20, or more), {GROUP_APPOINTMENT_MIN_ATTENDEES}+ paid
                signups, unlimited seats — refunded only if minimum not met 1 hour before start; otherwise
                non-refundable.
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10, marginBottom: 4 }}>
                Class type
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <Pressable
                  onPress={() => {
                    setPricingTier("standard");
                    setMinAttendees("5");
                    setPricePerMin("0.20");
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: pricingTier === "standard" ? colors.primary : colors.background,
                      borderColor: pricingTier === "standard" ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: pricingTier === "standard" ? "#fff" : colors.foreground,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Standard ($0.20+/min)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPricingTier("group_appointment");
                    setMinAttendees(String(GROUP_APPOINTMENT_MIN_ATTENDEES));
                    setPricePerMin("0.01");
                    setMaxAttendees(String(MAX_SESSION_ATTENDEES));
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        pricingTier === "group_appointment" ? colors.primary : colors.background,
                      borderColor:
                        pricingTier === "group_appointment" ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: pricingTier === "group_appointment" ? "#fff" : colors.foreground,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    Group appointment ($0.01+/min · 25+)
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginVertical: 10 }}
              >
                {(ais.data ?? []).map((ai) => (
                  <Pressable
                    key={ai.creatorAiId}
                    onPress={() => {
                      setSelectedAi(ai.creatorAiId);
                      setPricePerMin(ai.pricePerMinuteUsd);
                    }}
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
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8, lineHeight: 16 }}>
                Classes must start at least 12 hours from now. Back-out with refund until 1h 30m before
                start, then a 30-minute fill window, then sign-ups close 1 hour before start.
              </Text>
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
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10, marginBottom: 4 }}>
                {pricingTier === "group_appointment"
                  ? "Rate per minute — $0.01 minimum, no ceiling"
                  : "Rate per minute — $0.20 minimum, no ceiling"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {(pricingTier === "group_appointment"
                  ? ["0.01", "0.02", "0.05", "0.20", "1.00"]
                  : ["0.20", "0.50", "1.00", "2.00", "5.00"]
                ).map((rate) => (
                  <Pressable
                    key={rate}
                    onPress={() => setPricePerMin(rate)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: pricePerMin === rate ? colors.primary : colors.background,
                        borderColor: pricePerMin === rate ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: pricePerMin === rate ? "#fff" : colors.foreground,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      ${rate}/min
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={pricePerMin}
                onChangeText={setPricePerMin}
                keyboardType="decimal-pad"
                placeholder={
                  pricingTier === "group_appointment"
                    ? "Custom rate (USD/min, min $0.01)"
                    : "Custom rate (USD/min, min $0.20)"
                }
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              {(() => {
                const rateCents =
                  pricingTier === "group_appointment"
                    ? Math.max(
                        GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
                        Math.round(parseFloat(pricePerMin) * 100) ||
                          GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
                      )
                    : Math.max(
                        CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
                        Math.round(parseFloat(pricePerMin) * 100) ||
                          CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
                      );
                const ticketCents = duration * rateCents;
                return (
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
                    Ticket preview: ${(ticketCents / 100).toFixed(2)} ({duration} min @ $
                    {(rateCents / 100).toFixed(2)}/min)
                  </Text>
                );
              })()}
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10, marginBottom: 4 }}>
                {pricingTier === "group_appointment"
                  ? `Minimum paid signups (at least ${GROUP_APPOINTMENT_MIN_ATTENDEES})`
                  : "Minimum attendees to run (class starts only if this many join)"}
              </Text>
              {pricingTier === "standard" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {["1", "3", "5", "10", "25"].map((min) => (
                  <Pressable
                    key={min}
                    onPress={() => setMinAttendees(min)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: minAttendees === min ? colors.primary : colors.background,
                        borderColor: minAttendees === min ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: minAttendees === min ? "#fff" : colors.foreground,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {min} min
                    </Text>
                  </Pressable>
                ))}
              </View>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                  Fixed at {GROUP_APPOINTMENT_MIN_ATTENDEES} paid tickets — unlimited room capacity.
                </Text>
              )}
              <TextInput
                value={minAttendees}
                onChangeText={setMinAttendees}
                keyboardType="number-pad"
                editable={pricingTier === "standard"}
                placeholder={
                  pricingTier === "group_appointment"
                    ? String(GROUP_APPOINTMENT_MIN_ATTENDEES)
                    : "Minimum to run (e.g. 5)"
                }
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground, marginBottom: 8 }]}
              />
              {pricingTier === "standard" ? (
              <>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 10, marginBottom: 4 }}>
                Room capacity (1–{MAX_SESSION_ATTENDEES.toLocaleString()} seats)
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {SESSION_CAPACITY_PRESETS.map((cap) => (
                  <Pressable
                    key={cap}
                    onPress={() => setMaxAttendees(String(cap))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          parseInt(maxAttendees, 10) === cap ? colors.primary : colors.background,
                        borderColor:
                          parseInt(maxAttendees, 10) === cap ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: parseInt(maxAttendees, 10) === cap ? "#fff" : colors.foreground,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {cap.toLocaleString()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                keyboardType="number-pad"
                placeholder={`Custom capacity (1–${MAX_SESSION_ATTENDEES.toLocaleString()})`}
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
              </>
              ) : null}
              <Pressable
                disabled={!selectedAi || !startsAt || schedule.isPending}
                onPress={() => {
                  const cap =
                    pricingTier === "group_appointment"
                      ? MAX_SESSION_ATTENDEES
                      : Math.min(
                          MAX_SESSION_ATTENDEES,
                          Math.max(1, parseInt(maxAttendees, 10) || 1),
                        );
                  const minToRun =
                    pricingTier === "group_appointment"
                      ? GROUP_APPOINTMENT_MIN_ATTENDEES
                      : Math.min(cap, Math.max(1, parseInt(minAttendees, 10) || 1));
                  const rateCents =
                    pricingTier === "group_appointment"
                      ? Math.max(
                          GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
                          Math.round(parseFloat(pricePerMin) * 100) ||
                            GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE,
                        )
                      : Math.max(
                          CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
                          Math.round(parseFloat(pricePerMin) * 100) ||
                            CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
                        );
                  if (
                    pricingTier === "standard" &&
                    parseFloat(pricePerMin) * 100 < CREATOR_MIN_PRICE_CENTS_PER_MINUTE
                  ) {
                    Alert.alert(
                      "Minimum rate",
                      "$0.20 per minute is the floor for standard classes. Use Group appointment for $0.01+/min with 25+ attendees.",
                    );
                    return;
                  }
                  if (
                    pricingTier === "group_appointment" &&
                    parseFloat(pricePerMin) * 100 < GROUP_APPOINTMENT_MIN_PRICE_CENTS_PER_MINUTE
                  ) {
                    Alert.alert(
                      "Minimum rate",
                      "$0.01 per minute is the floor for group appointments. You may charge more.",
                    );
                    return;
                  }
                  schedule.mutate({
                    creatorAiId: selectedAi,
                    startsAt,
                    title: title.trim() || undefined,
                    durationMinutes: duration,
                    maxAttendees: cap,
                    minAttendeesToStart: minToRun,
                    pricingTier,
                    priceCentsPerMinute: rateCents,
                  });
                }}
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
                        ${(c.priceCents / 100).toFixed(2)} ticket ·{" "}
                        {c.attendeeCount}/{c.maxAttendees} tickets · min {c.minAttendeesToStart ?? 1} to run
                      </Text>
                      {"enrollmentLabel" in c ? (
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600" }}>
                          {String(c.enrollmentLabel)}
                        </Text>
                      ) : null}
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
                          Alert.alert(
                            "Cancel class?",
                            "Paid tickets are non-refundable. Cancelling does not issue refunds — attendees were told they must attend after purchase.",
                            [
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
                    {c.status === "ended" ? (
                      <Pressable
                        onPress={() => {
                          setReplaySessionId(c.id);
                          setReplayPrice(
                            c.replayPriceCents
                              ? (c.replayPriceCents / 100).toFixed(2)
                              : Math.max(0.99, (c.priceCents / 200)).toFixed(2),
                          );
                        }}
                        style={[styles.smallBtn, { backgroundColor: "#059669" }]}
                      >
                        <Text style={styles.smallBtnText}>
                          {c.replayPublished ? "Edit pay-per-view" : "Sell replay (PPV)"}
                        </Text>
                      </Pressable>
                    ) : null}
                    {c.replayPublished && c.replayId ? (
                      <Pressable
                        onPress={() => router.push(`/class-replay/${c.replayId}`)}
                        style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.smallBtnText}>Open replay</Text>
                      </Pressable>
                    ) : null}
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
                  {replaySessionId === c.id ? (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "700" }}>
                        Pay-per-view replay for people who missed this class
                      </Text>
                      <TextInput
                        value={replayPrice}
                        onChangeText={setReplayPrice}
                        placeholder="4.99"
                        placeholderTextColor={colors.muted}
                        keyboardType="decimal-pad"
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      />
                      <MuxVideoUploader sessionId={c.id} onUploadId={setReplayMuxUploadId} />
                      <TextInput
                        value={replayVideoUrl}
                        onChangeText={setReplayVideoUrl}
                        placeholder="Fallback https link if Mux is offline"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="none"
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      />
                      <Pressable
                        onPress={() =>
                          publishReplay.mutate({
                            sessionId: c.id,
                            priceCents: Math.round(Number(replayPrice) * 100),
                            videoUrl: replayVideoUrl.trim() || undefined,
                            muxUploadId: replayMuxUploadId,
                          })
                        }
                        disabled={publishReplay.isPending}
                        style={[styles.smallBtn, { backgroundColor: "#059669" }]}
                      >
                        <Text style={styles.smallBtnText}>
                          {publishReplay.isPending ? "Publishing…" : "Publish pay-per-view"}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
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
