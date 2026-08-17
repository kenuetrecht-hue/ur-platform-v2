import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { trpc } from "@/lib/trpc";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LANDING_SPECIALIST_COUNT_LABEL } from "@/lib/landing-checkout-pricing";
import { buildHandoffUrl } from "@/lib/app-handoff-url";
import { PaymentChannelNotice } from "@/components/payment-channel-notice";
import { LandingPaymentSuccessModal } from "@/components/landing/landing-payment-success-modal";
import { PricingComingSoonPanel } from "@/components/pricing-coming-soon-panel";
import { PUBLIC_PRICING_ENABLED } from "@/lib/pricing-visibility";

export function LandingCheckoutCta() {
  const [email, setEmail] = useState("");
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const purchase = trpc.landing.purchasePlatformPass.useMutation({
    onSuccess: (data) => {
      setError(null);
      setHandoffUrl(buildHandoffUrl(data.handoffToken));
    },
    onError: (err) => setError(err.message),
  });

  const handlePurchase = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter your email to activate membership after payment.");
      return;
    }
    setError(null);
    purchase.mutate({ email: trimmed });
  };

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.tag}>THE HANDOFF</Text>
        <Text style={styles.title}>Unlock the whole platform.</Text>
        {PUBLIC_PRICING_ENABLED ? (
          <>
            <Text style={styles.sub}>
              All {LANDING_SPECIALIST_COUNT_LABEL} specialists share one UR account — one membership per
              AI. Subscriptions via web browser; talk packs via mobile app.
            </Text>

            <PaymentChannelNotice compact />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email for instant app login"
              placeholderTextColor={T.muted}
              keyboardType="email-address"
              autoCapitalize="none"
          autoCorrect={false}
          maxLength={120}
          style={styles.input}
          editable={!purchase.isPending && !handoffUrl}
        />

        <Pressable
          onPress={handlePurchase}
          disabled={purchase.isPending || Boolean(handoffUrl)}
          style={[styles.stripeBtn, (purchase.isPending || handoffUrl) && styles.btnDisabled]}
        >
          {purchase.isPending ? (
            <ActivityIndicator color="#001018" />
          ) : (
            <Text style={styles.stripeBtnText}>
              Unlock All {LANDING_SPECIALIST_COUNT_LABEL} Specialists
            </Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.note}>
          By continuing you agree to platform disclosures. Secure checkout · Stripe integration
          online with UR LLC. AI output is educational and entertainment only.
        </Text>
          </>
        ) : (
          <>
            <Text style={styles.sub}>
              All {LANDING_SPECIALIST_COUNT_LABEL} specialists on one UR account. Membership pricing
              is being finalized for the live test — join free and message the platform owner for early
              access.
            </Text>
            <PricingComingSoonPanel compact />
          </>
        )}
      </View>

      {PUBLIC_PRICING_ENABLED ? (
        <LandingPaymentSuccessModal
          visible={Boolean(handoffUrl)}
          handoffUrl={handoffUrl ?? ""}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.electric,
    backgroundColor: T.bgElevated,
    padding: 24,
    marginBottom: 40,
    shadowColor: T.electric,
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  tag: { color: T.electric, fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
  title: { color: T.text, fontSize: 26, fontWeight: "900", marginBottom: 10 },
  sub: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 14 : 12,
    color: T.text,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: T.bg,
  },
  stripeBtn: {
    backgroundColor: T.electric,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  btnDisabled: { opacity: 0.75 },
  stripeBtnText: {
    color: "#001018",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  error: { color: "#f87171", fontSize: 13, marginBottom: 8, textAlign: "center" },
  note: { color: T.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
});
