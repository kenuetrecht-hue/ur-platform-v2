import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import {
  LANDING_SPECIALIST_COUNT_LABEL,
  getLandingPlatformPassPriceDisplay,
} from "@/lib/landing-checkout-pricing";
import { PricingComingSoonPanel } from "@/components/pricing-coming-soon-panel";
import { LandingAppDownloadLink } from "@/components/landing/landing-app-download-link";
import { PUBLIC_PRICING_ENABLED } from "@/lib/pricing-visibility";
import { PLATFORM_PASS_CENTS } from "@/lib/ai-subscription-pricing";
import { MESSAGE_ALLOWANCE_BY_TIER } from "@/lib/usage-caps-catalog";
import {
  AI_TALK_BULK_1000_MINUTES,
  AI_TALK_BULK_500_MINUTES,
  AI_TALK_FIVE_DOLLAR_MINUTES,
  computeTalkMinutesForDollars,
} from "@/lib/ai-talk-pricing";

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)} USD`;
}

const text = MESSAGE_ALLOWANCE_BY_TIER.standard;

const POLICY_LINKS = [
  { href: "/services" as const, label: "Products and prices" },
  { href: "/refunds" as const, label: "Refunds & Returns" },
  { href: "/cancellations" as const, label: "Cancellations" },
  { href: "/terms" as const, label: "Terms of Use" },
  { href: "/privacy" as const, label: "Privacy Policy" },
  { href: "/contact" as const, label: "Contact" },
];

/** Public price list. No card form until live Stripe Checkout is the only way to pay. */
export function LandingCheckoutCta() {
  const monthlyLabel = getLandingPlatformPassPriceDisplay();

  return (
    <View style={styles.wrap}>
      <Text style={styles.tag}>UR PLATFORM LLC · USD</Text>
      <Text style={styles.title}>Digital products and prices</Text>
      {PUBLIC_PRICING_ENABLED ? (
        <>
          <Text style={styles.sub}>
            Adults 18 and older. All {LANDING_SPECIALIST_COUNT_LABEL} specialists are on one account.
            The month text pass is {monthlyLabel}. Voice is sold separately as Talk Time. Card
            payments are processed by Stripe. UR Platform LLC does not see or store your full card
            number.
          </Text>
          <Text style={styles.priceLine}>AI text pass</Text>
          <Text style={styles.quote}>
            Day {usd(PLATFORM_PASS_CENTS.day)} for {text.day} messages · Week {usd(PLATFORM_PASS_CENTS.week)}{" "}
            for {text.week} messages · Month {usd(PLATFORM_PASS_CENTS.month)} for {text.month} messages
          </Text>
          <Text style={styles.priceLine}>Talk Time</Text>
          <Text style={styles.quote}>
            Web {usd(100)} for {computeTalkMinutesForDollars(1)} minutes · Mobile app {usd(500)} for{" "}
            {AI_TALK_FIVE_DOLLAR_MINUTES} minutes · Web {usd(12000)} for {AI_TALK_BULK_500_MINUTES}{" "}
            minutes · Web {usd(20000)} for {AI_TALK_BULK_1000_MINUTES} minutes
          </Text>
          <Text style={styles.note}>
            Prices are in United States dollars. Tax and the card fee are added at Stripe Checkout
            when they apply. Digital access is delivered in your account after Stripe confirms
            payment. Prepaid digital packages are final — see Refunds. Nothing on this page is
            shipped.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.sub}>
            All {LANDING_SPECIALIST_COUNT_LABEL} specialists on one UR account. Membership pricing
            is listed on the products page.
          </Text>
          <PricingComingSoonPanel compact />
        </>
      )}
      <View style={styles.linkRow}>
        {POLICY_LINKS.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable accessibilityRole="link" style={styles.linkBtn}>
              <Text style={styles.linkText}>{item.label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <LandingAppDownloadLink variant="inline" />
      </View>
    </View>
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
  priceLine: { color: T.gold, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  quote: { color: T.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  note: { color: T.muted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  linkBtn: {
    borderWidth: 1,
    borderColor: T.electric,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkText: { color: T.text, fontWeight: "800", fontSize: 13 },
});
