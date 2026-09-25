import { PublicLegalScreen } from "@/components/public-legal-screen";
import { TERMS_EFFECTIVE_DATE } from "@/lib/platform-terms-of-use";
import {
  ACCEPTED_CARDS_POLICY,
  CUSTOMER_SERVICE_BULLETS,
  DIGITAL_DELIVERY_POLICY,
  PAYMENT_SECURITY_POLICY,
  PURCHASE_CURRENCY_POLICY,
  WHAT_UR_SELLS_POLICY,
} from "@/lib/stripe-website-policies";
import { MESSAGE_ALLOWANCE_BY_TIER } from "@/lib/usage-caps-catalog";
import {
  AI_TALK_BULK_1000_MINUTES,
  AI_TALK_BULK_500_MINUTES,
  AI_TALK_FIVE_DOLLAR_MINUTES,
  computeTalkMinutesForDollars,
} from "@/lib/ai-talk-pricing";

const text = MESSAGE_ALLOWANCE_BY_TIER.standard;

/** Public product list. No login. This is the page Stripe can open. */
export default function PublicServicesScreen() {
  return (
    <PublicLegalScreen
      kicker="UR PLATFORM LLC"
      title="Products and services"
      lede="UR Platform LLC sells digital access for adults 18 and older. Nothing on this page is a physical product. Prices are in United States dollars (USD)."
      effectiveDate={TERMS_EFFECTIVE_DATE}
      sections={[
        {
          id: "business",
          title: "The business",
          bullets: [WHAT_UR_SELLS_POLICY, PURCHASE_CURRENCY_POLICY],
        },
        {
          id: "text-pass",
          title: "AI text pass",
          bullets: [
            `Day pass: $7.99 USD for ${text.day} text messages, about 24 hours.`,
            `Week pass: $15.99 USD for ${text.week} text messages, 7 days.`,
            `Month pass: $24.99 USD for ${text.month} text messages, 30 days.`,
            "One pass covers the specialists. You chat with one specialist at a time. Web search included with an active text pass is limited per day.",
          ],
        },
        {
          id: "talk-time",
          title: "Talk Time — the AI speaks back",
          bullets: [
            `Web: $1.00 USD for ${computeTalkMinutesForDollars(1)} minutes.`,
            `Mobile app: $5.00 USD for ${AI_TALK_FIVE_DOLLAR_MINUTES} minutes.`,
            `Web: $120.00 USD for ${AI_TALK_BULK_500_MINUTES} minutes.`,
            `Web: $200.00 USD for ${AI_TALK_BULK_1000_MINUTES} minutes.`,
            "Talk Time is separate from the text pass. The microphone printing your words uses the text pass. Hearing the AI uses Talk Time.",
          ],
        },
        {
          id: "other-digital",
          title: "Other digital access",
          bullets: [
            "Live class tickets and replays, 3D workspace access, and cartoon and music studio credits are prepaid digital packages inside the signed-in website or app.",
            "Human creators may later sell their own classes or tips. Those sales are between the member and that creator. UR Platform LLC is not the seller of those creator charges.",
            "UR Platform LLC is not selling physical merchandise, dropship goods, or affiliate products on this website right now.",
          ],
        },
        {
          id: "pay",
          title: "How you pay and how you receive it",
          bullets: [ACCEPTED_CARDS_POLICY, PAYMENT_SECURITY_POLICY, DIGITAL_DELIVERY_POLICY],
        },
        {
          id: "help",
          title: "Customer service",
          bullets: [
            ...CUSTOMER_SERVICE_BULLETS,
            "Terms: /terms. Refunds: /refunds. Privacy: /privacy. Cancellations: /cancellations. Contact: /contact.",
          ],
        },
      ]}
    />
  );
}
