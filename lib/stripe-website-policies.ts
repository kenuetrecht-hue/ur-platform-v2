import type { TermsSection } from "@/lib/platform-terms-of-use";
import {
  AI_PURCHASE_NO_REFUND_POLICY,
  CREATOR_TRANSACTION_DISCLAIMER,
  TERMS_BILLING_ENTITY,
  TERMS_BUSINESS_ADDRESS,
  TERMS_LEGAL_EMAIL,
  TERMS_PRIVACY_EMAIL,
  TERMS_PUBLIC_WEBSITE,
  TERMS_SUPPORT_EMAIL,
  TERMS_SUPPORT_PHONE,
} from "@/lib/platform-terms-of-use";

/** Stripe website checklist: say USD, not only a $ sign. */
export const PURCHASE_CURRENCY_POLICY =
  "All UR Platform prices are in United States dollars (USD). Tax and card-processing fees are added at checkout when they apply.";

export const WHAT_UR_SELLS_POLICY =
  `${TERMS_BILLING_ENTITY} sells adult digital access on ${TERMS_PUBLIC_WEBSITE}: AI specialist text passes, Talk Time (the AI speaking back), live class tickets and replays, 3D workspace access, cartoon and music studio credits, and other in-app digital packages. ` +
  "We also host human creators who may sell their own classes, shop items, or tips. Those creator sales are between you and that creator.";

export const LEGAL_RESTRICTIONS_POLICY =
  "UR Platform is for adults 18 or older in the United States. Nobody under 18 may join or buy. You must complete ID front, ID back, and a live selfie before entering the product. AI output is entertainment and education — not licensed medical, legal, tax, or financial advice. Do not use UR to plan or hide crime.";

export const PAYMENT_SECURITY_POLICY =
  "Card payments are processed by Stripe. UR Platform LLC does not see, store, or write down your full card number. Checkout uses HTTPS. Stripe is a PCI Service Provider. Completing checkout means you agree to these public policies and the no-refund checkbox shown before you pay.";

export const DIGITAL_DELIVERY_POLICY =
  "Digital packages are delivered in your UR account after Stripe confirms payment — usually within a few minutes. Text-pass messages, Talk minutes, studio credits, and similar access appear in the signed-in website or app. Nothing physical is shipped for those packages. If access does not appear, email support with the email on the account, the date, and the amount.";

export const PHYSICAL_SHIPPING_POLICY =
  "UR Platform LLC does not ship physical goods for AI or digital packages. If a human creator or a print partner later ships merch, that seller states shipping methods, times, rates, and destinations on that order. UR is not the shipper of creator merch.";

export const RETURN_POLICY =
  "There is no physical return for digital packages because nothing is mailed. You cannot return unused messages, Talk minutes, credits, or time. Creator physical goods, if any, follow that creator's return process — not UR's.";

export const REFUND_REQUEST_PROCESS =
  `To ask about a charge, email ${TERMS_SUPPORT_EMAIL} from the email on your account. Include the date, the USD amount, and what you bought. ` +
  "We review whether the charge is ours and whether it matches these rules. For UR digital packages the answer is no refund — the sale is final, including unused time. " +
  "If the charge is a creator purchase, we point you to that creator. Chargebacks filed to skip these rules may lead to account suspension.";

export const CANCELLATION_POLICY_BULLETS = [
  "Text passes and Talk Time packs are prepaid. They do not auto-renew unless you turn auto-renew on at checkout.",
  "If you turned auto-renew on, cancel it in Profile before the next charge. You keep what you already paid until that period ends. Unused leftover time is not refunded.",
  "You can stop using UR at any time. Closing the tab or deleting the app does not refund a prepaid package.",
  "Live class tickets follow the class rules shown at checkout. A group class may cancel automatically if the minimum is not met one hour before start. After the lock-in window, tickets are final except that automatic minimum-not-met cancellation.",
  "Creator subscriptions or creator shop orders are cancelled with that creator. UR cannot override a creator's cancel or refund rule except where the law requires it.",
  `Email ${TERMS_SUPPORT_EMAIL} if you cannot find the cancel control. We will tell you the tap path. That email is not a refund request.`,
] as const;

export const CUSTOMER_SERVICE_BULLETS = [
  `Phone: ${TERMS_SUPPORT_PHONE}`,
  `Email: ${TERMS_SUPPORT_EMAIL}`,
  `Privacy questions: ${TERMS_PRIVACY_EMAIL}`,
  `Legal questions: ${TERMS_LEGAL_EMAIL}`,
  "After you sign in, Profile → Help has the same contact path and common answers.",
  "We read email and voicemail on business days and aim to reply within two business days.",
  "We do not take card numbers by email or by phone. Never read a full card number to us.",
] as const;

export const ACCEPTED_CARDS_POLICY =
  "Checkout through Stripe accepts Visa, Mastercard, American Express, and Discover where Stripe supports those brands for your card.";

export const WHAT_WE_SELL_SECTIONS: TermsSection[] = [
  {
    id: "what-we-sell",
    title: "What UR Platform sells",
    bullets: [WHAT_UR_SELLS_POLICY, PURCHASE_CURRENCY_POLICY, ACCEPTED_CARDS_POLICY],
  },
  {
    id: "legal-restrictions",
    title: "Legal restrictions",
    bullets: [LEGAL_RESTRICTIONS_POLICY],
  },
  {
    id: "payment-security",
    title: "How card payments are handled",
    bullets: [PAYMENT_SECURITY_POLICY],
  },
];

export const REFUND_AND_RETURN_SECTIONS: TermsSection[] = [
  {
    id: "refund-rule",
    title: "Refund policy — digital packages",
    bullets: [AI_PURCHASE_NO_REFUND_POLICY, REFUND_REQUEST_PROCESS],
  },
  {
    id: "returns",
    title: "Return policy and process",
    bullets: [RETURN_POLICY],
  },
  {
    id: "delivery",
    title: "Delivery and shipping",
    bullets: [DIGITAL_DELIVERY_POLICY, PHYSICAL_SHIPPING_POLICY],
  },
  {
    id: "creator-refunds",
    title: "Creator purchases",
    bullets: [CREATOR_TRANSACTION_DISCLAIMER],
  },
];

export const CANCELLATION_SECTIONS: TermsSection[] = [
  {
    id: "cancellation",
    title: "Cancellation policy",
    bullets: [...CANCELLATION_POLICY_BULLETS],
  },
];

export const CONTACT_SECTIONS: TermsSection[] = [
  {
    id: "customer-service",
    title: "Customer service",
    bullets: [...CUSTOMER_SERVICE_BULLETS],
  },
  {
    id: "business",
    title: "Business",
    bullets: [
      `${TERMS_BILLING_ENTITY} · ${TERMS_BUSINESS_ADDRESS} · ${TERMS_PUBLIC_WEBSITE}`,
      WHAT_UR_SELLS_POLICY,
      PURCHASE_CURRENCY_POLICY,
    ],
  },
];
