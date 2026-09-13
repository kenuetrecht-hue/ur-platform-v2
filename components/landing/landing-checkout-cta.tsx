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
import { useAuth } from "@/lib/auth-context";
import { Link } from "expo-router";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import {
  LANDING_ALL_SPECIALISTS_MONTHLY_CENTS,
  LANDING_SPECIALIST_COUNT_LABEL,
  getLandingPlatformPassPriceDisplay,
} from "@/lib/landing-checkout-pricing";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { calculateCustomerCheckout } from "@/lib/stripe-checkout-pricing";
import type { UsStateCode } from "@/lib/us-state-taxes";
import { buildHandoffUrl } from "@/lib/app-handoff-url";
import { PaymentChannelNotice } from "@/components/payment-channel-notice";
import { LandingPaymentSuccessModal } from "@/components/landing/landing-payment-success-modal";
import { PricingComingSoonPanel } from "@/components/pricing-coming-soon-panel";
import { LandingAppDownloadLink } from "@/components/landing/landing-app-download-link";
import { PUBLIC_PRICING_ENABLED } from "@/lib/pricing-visibility";

export function LandingCheckoutCta() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const quote = calculateCustomerCheckout(LANDING_ALL_SPECIALISTS_MONTHLY_CENTS, billingState);
  const monthlyLabel = getLandingPlatformPassPriceDisplay();

  const purchase = trpc.landing.purchasePlatformPass.useMutation({
    onSuccess: (data) => {
      setError(null);
      setHandoffUrl(buildHandoffUrl(data.handoffToken));
    },
    onError: (err) => setError(err.message),
  });

  const handlePurchase = () => {
    if (!isAuthenticated) {
      setError("Login first. Checkout is closed to unsigned visitors.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter your email to activate membership after payment.");
      return;
    }
    if (!billingState) {
      setError("Select your billing state so sales tax and the Stripe card fee are added to your card.");
      return;
    }
    setError(null);
    purchase.mutate({
      email: trimmed,
      billingStateCode: billingState,
    });
  };

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.tag}>THE HANDOFF</Text>
        <Text style={styles.title}>Unlock the whole platform.</Text>
        {PUBLIC_PRICING_ENABLED ? (
          <>
            <Text style={styles.sub}>
              All {LANDING_SPECIALIST_COUNT_LABEL} specialists on one account — {monthlyLabel} text
              pass. You pay sales tax and the Stripe card fee. UR and content creators do not absorb
              those. Voice talk is sold separately.
            </Text>
            <Text style={styles.priceLine}>{monthlyLabel} plus tax & card fee</Text>
            {billingState ? (
              <Text style={styles.quote}>
                {quote.subtotalDisplay} + {quote.salesTaxDisplay} tax + {quote.stripeFeeDisplay} card
                fee = {quote.totalDisplay} charged to you
              </Text>
            ) : (
              <Text style={styles.quote}>
                Pick your billing state to see tax. Oregon and a few others have no sales tax — the
                card fee still sits on top.
              </Text>
            )}

            <PaymentChannelNotice compact />
            <BillingStatePicker value={billingState} onChange={setBillingState} />

            {!isAuthenticated ? (
              <Link href="/login" asChild>
                <Pressable style={styles.stripeBtn}>
                  <Text style={styles.stripeBtnText}>Login to check out</Text>
                </Pressable>
              </Link>
            ) : (
              <>
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
                      Unlock All {LANDING_SPECIALIST_COUNT_LABEL} — {quote.totalDisplay}
                    </Text>
                  )}
                </Pressable>
              </>
            )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.note}>
          Adults 18+ only. Login or Sign up, photograph ID front and back plus a matching selfie (fraud
          protection — UR does not keep the pictures), then purchase. Sales tax and Stripe’s 2.9% +
          $0.30 are added to your card — not taken from UR or from a creator. AI output is educational
          and entertainment only.
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
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <LandingAppDownloadLink variant="inline" />
        </View>
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
  sub: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  priceLine: { color: T.gold, fontSize: 20, fontWeight: "900", marginBottom: 6 },
  quote: { color: T.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
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
