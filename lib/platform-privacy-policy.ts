import type { TermsSection } from "@/lib/platform-terms-of-use";
import {
  COMMUNICATIONS_AUDIT_POLICY,
  LAW_ENFORCEMENT_COOPERATION_POLICY,
  TERMS_BILLING_ENTITY,
  TERMS_EFFECTIVE_DATE,
  TERMS_BUSINESS_ADDRESS,
  TERMS_HOME_STATE,
  TERMS_PRIVACY_EMAIL,
  TERMS_SUPPORT_EMAIL,
  TERMS_SUPPORT_PHONE,
} from "@/lib/platform-terms-of-use";
import {
  AGE_VERIFY_THIRD_PARTY,
  AGE_VERIFY_WHAT_WE_KEEP,
  DATA_NOT_SOLD,
  SECURITY_BREACH_PROMISE,
  WHAT_UR_DOES_NOT_STORE,
  WHAT_UR_STORES_ON_THE_WEBSITE,
} from "@/lib/signup-step-copy";
import { PAYMENT_SECURITY_POLICY } from "@/lib/stripe-website-policies";

/** Same words already used at signup and in the Terms — printed for the public site. */
export const PLATFORM_PRIVACY_SECTIONS: TermsSection[] = [
  {
    id: "who",
    title: "Who we are",
    bullets: [
      `${TERMS_BILLING_ENTITY} operates UR Platform at https://urplatform.llc. We are formed in ${TERMS_HOME_STATE}.`,
      `Business address: ${TERMS_BUSINESS_ADDRESS}.`,
      `Questions about this policy: ${TERMS_PRIVACY_EMAIL} or ${TERMS_SUPPORT_EMAIL} · Phone: ${TERMS_SUPPORT_PHONE}.`,
    ],
  },
  {
    id: "what-we-store",
    title: "What stays on the website",
    bullets: [...WHAT_UR_STORES_ON_THE_WEBSITE],
  },
  {
    id: "what-we-do-not-store",
    title: "What we do not keep",
    bullets: [...WHAT_UR_DOES_NOT_STORE],
  },
  {
    id: "id-check",
    title: "18+ ID check",
    bullets: [AGE_VERIFY_THIRD_PARTY, AGE_VERIFY_WHAT_WE_KEEP],
  },
  {
    id: "not-sold",
    title: "We do not sell your information",
    bullets: [DATA_NOT_SOLD, SECURITY_BREACH_PROMISE],
  },
  {
    id: "communications",
    title: "Messages inside UR",
    bullets: [COMMUNICATIONS_AUDIT_POLICY],
  },
  {
    id: "payments",
    title: "Payments",
    bullets: [
      PAYMENT_SECURITY_POLICY,
      "Stripe receives the card details you type at checkout. UR keeps the purchase record (what you bought, when, and the amount) so we can deliver access and answer billing questions.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and bot check",
    bullets: [
      "The website uses a sign-in session so you stay logged in. Cloudflare Turnstile runs a bot check on login, signup, the landing demo, and the 18+ ID step.",
      "Those tools exist to stop fake accounts and card testing. They are not used to sell ads.",
    ],
  },
  {
    id: "deletion",
    title: "How to ask us to delete or correct your data",
    bullets: [
      `Email ${TERMS_PRIVACY_EMAIL} or ${TERMS_SUPPORT_EMAIL} from the email on your account and say what you want deleted or corrected.`,
      "We keep records we must keep for the law, for a paid-access dispute, or for a safety investigation. ID pictures are not kept as reusable copies.",
    ],
  },
  {
    id: "law-enforcement",
    title: "When we share information",
    bullets: [LAW_ENFORCEMENT_COOPERATION_POLICY],
  },
];

export const PRIVACY_EFFECTIVE_DATE = TERMS_EFFECTIVE_DATE;
