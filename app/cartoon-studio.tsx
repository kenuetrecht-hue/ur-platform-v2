import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { CartoonStudioPlayer } from "@/components/cartoon-studio-player";
import { CartoonStudioEditor } from "@/components/cartoon-studio-editor";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { PaymentChannelNotice } from "@/components/payment-channel-notice";
import { PurchaseSummaryCard } from "@/components/purchase-summary-card";
import { useColors } from "@/hooks/use-colors";
import { useBillingState } from "@/hooks/use-billing-state";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { getClientPlatform, openWebBrowserCheckout } from "@/lib/web-checkout";
import {
  CARTOON_IDEA_MAX,
  CARTOON_STUDIO_RULE,
  CARTOON_STUDIO_TITLE,
  CARTOON_STYLES,
  type CartoonStyleId,
} from "@/lib/cartoon-studio";
import {
  CARTOON_STUDIO_BILLING_NOTES,
  CARTOON_STUDIO_NO_REFUND_POLICY,
  CARTOON_STUDIO_PAY_FIRST_RULE,
  CARTOON_STUDIO_PRICING_SUMMARY,
  CARTOON_STUDIO_TIERS,
  CARTOON_STUDIO_WEB_PATH,
  type CartoonStudioTierId,
} from "@/lib/cartoon-studio-pricing";
import { buildCartoonStudioPurchaseSummary } from "@/lib/pricing-disclosures";

export default function CartoonStudioScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();
  const { isPlatformOwner } = usePlatformOwner();
  const { stateCode, setStateCode, hasState } = useBillingState();
  const clientPlatform = getClientPlatform();

  const [idea, setIdea] = useState("A beginner electrician shows a cartoon house how a breaker keeps a kitchen safe.");
  const [style, setStyle] = useState<CartoonStyleId>("classic");
  const [tierId, setTierId] = useState<CartoonStudioTierId>("draft");
  const [seconds, setSeconds] = useState(8);
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = trpc.cartoonStudio.list.useQuery();
  const purchase = trpc.cartoonStudio.purchaseAndCreate.useMutation({
    onSuccess: (result) => {
      setActiveId(result.project.id);
      setAcceptedNoRefund(false);
      void utils.cartoonStudio.list.invalidate();
    },
  });
  const complimentary = trpc.cartoonStudio.create.useMutation({
    onSuccess: (project) => {
      setActiveId(project.id);
      void utils.cartoonStudio.list.invalidate();
    },
  });
  const updateTimeline = trpc.cartoonStudio.updateTimeline.useMutation({
    onSuccess: () => {
      void utils.cartoonStudio.list.invalidate();
    },
  });
  const remove = trpc.cartoonStudio.delete.useMutation({
    onSuccess: () => {
      setActiveId(null);
      void utils.cartoonStudio.list.invalidate();
    },
  });

  const selectedTier = CARTOON_STUDIO_TIERS.find((tier) => tier.id === tierId) ?? CARTOON_STUDIO_TIERS[0]!;
  const otherTier = CARTOON_STUDIO_TIERS.find((tier) => tier.id !== tierId) ?? CARTOON_STUDIO_TIERS[0]!;
  const summary = useMemo(
    () =>
      hasState
        ? buildCartoonStudioPurchaseSummary({
            tierId,
            seconds,
            stateCode,
          })
        : null,
    [hasState, tierId, seconds, stateCode],
  );
  const active = list.data?.find((project) => project.id === activeId) ?? list.data?.[0] ?? null;
  const mustUseWeb = clientPlatform === "native" && !isPlatformOwner;

  return (
    <ScreenContainer className="bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TabScreenHeader
          icon="🎬"
          title={CARTOON_STUDIO_TITLE}
          subtitle="Website and app. Pay first. Draft, Lite, Mid, Cinema, or Premiere 4K. No refunds."
        />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>← Back</Text>
          </Pressable>

          <PaymentChannelNotice />

          <View style={[styles.billBox, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Billing — read this first</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{CARTOON_STUDIO_PAY_FIRST_RULE}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{CARTOON_STUDIO_PRICING_SUMMARY}</Text>
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, fontWeight: "700" }}>
              {CARTOON_STUDIO_NO_REFUND_POLICY}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{CARTOON_STUDIO_RULE}</Text>
          </View>

          <Text style={{ color: colors.foreground, fontWeight: "800" }}>1. Pick a plan — cheap to 4K</Text>
          <View style={{ gap: 10 }}>
            {CARTOON_STUDIO_TIERS.map((tier) => {
              const selected = tier.id === tierId;
              return (
                <Pressable
                  key={tier.id}
                  onPress={() => {
                    setTierId(tier.id);
                    setSeconds(tier.secondOptions[0] ?? 8);
                  }}
                  style={[
                    styles.plan,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.surface : colors.background,
                    },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>
                    {tier.badge} · {tier.label}
                  </Text>
                  <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
                    ${(tier.rateCentsPerSecond / 100).toFixed(2)} / sec · min ${(tier.minCents / 100).toFixed(2)}
                  </Text>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                    Resolution: {tier.resolutionLabel}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{tier.usedFor}</Text>
                  <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, fontWeight: "700" }}>
                    Difference: {tier.difference}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                    What this cost is for: {tier.costExplained}
                  </Text>
                  {tier.youGet.map((item) => (
                    <Text key={item} style={{ color: colors.foreground, fontSize: 12 }}>
                      • {item}
                    </Text>
                  ))}
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            Ladder: Draft (stills) → Lite (cheap 720p engine) → Mid (1080p fast) → Cinema (1080p quality) → Premiere 4K
            (highest resolution). You selected {selectedTier.label}. Compared with {otherTier.label}: {otherTier.difference}
          </Text>

          <Text style={{ color: colors.foreground, fontWeight: "800" }}>2. Prepaid length</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {selectedTier.secondOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setSeconds(option)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: seconds === option ? colors.primary : colors.surface,
                    borderColor: seconds === option ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: seconds === option ? "#fff" : colors.foreground, fontWeight: "700" }}>
                  {option} seconds
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.foreground, fontWeight: "800" }}>3. Cartoon look</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CARTOON_STYLES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setStyle(item.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: style === item.id ? colors.primary : colors.surface,
                    borderColor: style === item.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: style === item.id ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {CARTOON_STYLES.find((item) => item.id === style)?.hint}
          </Text>

          <Text style={{ color: colors.foreground, fontWeight: "800" }}>4. Idea or script</Text>
          <TextInput
            value={idea}
            onChangeText={setIdea}
            maxLength={CARTOON_IDEA_MAX}
            multiline
            placeholder="A plumber cartoon teaches why a trap holds water…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
          />

          <Text style={{ color: colors.foreground, fontWeight: "800" }}>5. Pay now — then we build</Text>
          {CARTOON_STUDIO_BILLING_NOTES.map((note) => (
            <Text key={note} style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
              • {note}
            </Text>
          ))}
          <BillingStatePicker value={stateCode} onChange={setStateCode} />
          {summary ? <PurchaseSummaryCard summary={summary} /> : (
            <Text style={{ color: colors.muted, fontSize: 13 }}>Select your billing state to see tax, Stripe, and the exact card total.</Text>
          )}
          <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((value) => !value)} />

          {mustUseWeb ? (
            <Pressable
              onPress={() => void openWebBrowserCheckout(CARTOON_STUDIO_WEB_PATH)}
              style={[styles.primary, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryText}>Continue in browser to pay</Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={
                purchase.isPending ||
                idea.trim().length < 8 ||
                !hasState ||
                !acceptedNoRefund ||
                !isAuthenticated
              }
              onPress={() => {
                if (!stateCode || !acceptedNoRefund) return;
                purchase.mutate({
                  idea: idea.trim(),
                  style,
                  tierId,
                  seconds,
                  stateCode,
                  clientPlatform,
                  acceptedNoRefund: true,
                });
              }}
              style={[
                styles.primary,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    purchase.isPending || idea.trim().length < 8 || !hasState || !acceptedNoRefund || !isAuthenticated
                      ? 0.5
                      : 1,
                },
              ]}
            >
              {purchase.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>
                  {!isAuthenticated
                    ? "Sign in to pay"
                    : !hasState
                      ? "Select your state to continue"
                      : !acceptedNoRefund
                        ? "Check the no-refund box to continue"
                        : `Pay ${summary?.pricing.totalDisplay ?? ""} and build ${selectedTier.label}`}
                </Text>
              )}
            </Pressable>
          )}
          {purchase.error ? (
            <Text style={{ color: "#c0392b", fontSize: 13 }}>{purchase.error.message}</Text>
          ) : null}
          {purchase.data?.message ? (
            <Text style={{ color: colors.muted, fontSize: 12 }}>{purchase.data.message}</Text>
          ) : null}

          {isPlatformOwner ? (
            <Pressable
              disabled={complimentary.isPending || idea.trim().length < 8}
              onPress={() => complimentary.mutate({ idea: idea.trim(), style, tierId, seconds })}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Owner complimentary build (no card)
              </Text>
            </Pressable>
          ) : null}

          {active ? (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>{active.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
                {CARTOON_STUDIO_TIERS.find((tier) => tier.id === active.tier)?.label ?? active.tier} ·{" "}
                {CARTOON_STUDIO_TIERS.find((tier) => tier.id === active.tier)?.resolutionLabel} · prepaid{" "}
                {active.billedSeconds}s · used {active.totalSeconds}s
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{active.engineNote}</Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{active.script}</Text>
              <CartoonStudioPlayer project={active} />
              <CartoonStudioEditor
                project={active}
                disabled={updateTimeline.isPending}
                onChange={(next) => updateTimeline.mutate({ projectId: active.id, ...next })}
              />
              {updateTimeline.error ? (
                <Text style={{ color: "#c0392b", fontSize: 13 }}>{updateTimeline.error.message}</Text>
              ) : null}
              <Pressable onPress={() => remove.mutate({ projectId: active.id })}>
                <Text style={{ color: "#c0392b", fontWeight: "700" }}>Delete this cartoon</Text>
              </Pressable>
            </View>
          ) : null}

          {(list.data ?? []).length > 1 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>Your cartoons</Text>
              {list.data!.map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => setActiveId(project.id)}
                  style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>{project.title}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {project.tier} · {project.scenes.length} scenes · {project.totalSeconds}s of {project.billedSeconds}s paid
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  billBox: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 8 },
  plan: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 6 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 110,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 15,
  },
  primary: { borderRadius: 12, padding: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", textAlign: "center" },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
});
