/**
 * UR Platform Terms of Use — plain-language sections for UI, checkout, and legal reference.
 * Effective Aug 2026. Billed by UR Platform LLC, an Indiana limited liability company.
 */

export const TERMS_EFFECTIVE_DATE = "August 26, 2026";
export const TERMS_BILLING_ENTITY = "UR Platform LLC";
/** Domestic formation state — governing law and venue. Not a 50-state foreign qualification. */
export const TERMS_HOME_STATE = "Indiana";
export const TERMS_HOME_STATE_CODE = "IN";
export const TERMS_SUPPORT_EMAIL = "support@urplatform.llc";
export const TERMS_PRIVACY_EMAIL = "privacy@urplatform.llc";
export const TERMS_LEGAL_EMAIL = "legal@urplatform.llc";
export const TERMS_PUBLIC_WEBSITE = "https://urplatform.llc";

export const TERMS_GOVERNING_LAW =
  `These Terms are governed by the laws of the State of ${TERMS_HOME_STATE}, without regard to conflict of law principles. ` +
  `Any court proceeding shall be in the state or federal courts located in ${TERMS_HOME_STATE}, and you consent to that venue.`;

export type TermsSection = {
  id: string;
  title: string;
  bullets: string[];
};

/** Shown at checkout and in purchase summaries. */
export const AI_PURCHASE_NO_REFUND_POLICY =
  "All AI specialist subscriptions, usage credits, talk time, and related digital access purchases are final. " +
  "No returns and no refunds — including unused messages, credits, or minutes.";

export const CREATOR_TRANSACTION_DISCLAIMER =
  "Purchases from individual content creators (live classes, creator shop items, tips, or creator-specific offers) " +
  "are between you and that creator. UR Platform is not a party to those transactions and is not responsible for " +
  "creator refunds, returns, chargebacks, or disputes. Any return policy a creator offers must be stated by that creator " +
  "and enforced by that creator — not by UR Platform.";

export const ZERO_HARASSMENT_POLICY =
  "Zero tolerance for harassment. No bullying, threats, stalking, hate speech, sexual harassment, or targeted abuse " +
  "of any person — in chat, social posts, messages, voice, or any other UR feature — will be tolerated.";

export const HARASSMENT_ENFORCEMENT_POLICY =
  "If you are found harassing others on UR Platform, your privileges may be revoked immediately (suspended or banned). " +
  "No refunds will be issued for any remaining subscriptions, credits, talk time, or other paid access when your account " +
  "is restricted or terminated for harassment or abuse.";

export const HUMAN_CONDUCT_POLICY =
  "If someone misuses UR Platform or applies AI guidance unsafely or illegally, that is the human user's conduct — not the AI's, and not UR Platform LLC's or the platform owner's. " +
  "AIs teach and troubleshoot; they do not perform the work. The person on the job, in the kitchen, or at the keyboard is responsible for their own actions, errors, and compliance with the law.";

export const PLATFORM_LIABILITY_SUMMARY =
  "UR Platform and UR Platform LLC facilitate connections and AI tools only. We are not responsible for disputes, losses, or " +
  "claims between users, between users and creators, or arising from third-party services.";

export const PLATFORM_TERMS_SECTIONS: TermsSection[] = [
  {
    id: "acceptance",
    title: "Acceptance",
    bullets: [
      "By using UR Platform you agree to these Terms of Use, our Privacy Policy, and all purchase disclosures shown at checkout.",
      "If you do not agree, do not use the Platform.",
    ],
  },
  {
    id: "age-kyc",
    title: "18+ identity verification — required to enter",
    bullets: [
      "UR Platform is for adults 18 years or older. Nobody under 18 may join, enter the app, or use the website product.",
      "Before you can enter you must photograph a government ID (front and back) and a live selfie that matches the ID photo. This is mandatory.",
      "This gate exists because AI chat, social features, and paid access can be addictive for minors.",
      "We use the photos only to confirm you are 18+ and that the ID belongs to you. We store verification status and image hashes, not reusable copies of your ID, whenever possible.",
      "Failing the check, using someone else's ID, or a photo-of-a-photo selfie is a Terms violation. The account cannot enter.",
    ],
  },
  {
    id: "ai-no-refunds",
    title: "AI purchases — no returns, no refunds",
    bullets: [
      AI_PURCHASE_NO_REFUND_POLICY,
      "This applies to text subscriptions, image credits, code sandbox runs, book/chapter credits, web search packs, hive consults, voice talk time, 3D workspace access, and all other AI or platform digital access sold by UR Platform LLC.",
      "Expired or unused allowances are forfeited. Partial use does not entitle you to a refund.",
      "Chargebacks or payment disputes on AI purchases may result in immediate account suspension without refund.",
    ],
  },
  {
    id: "creator-transactions",
    title: "Content creator purchases — creator responsibility",
    bullets: [
      CREATOR_TRANSACTION_DISCLAIMER,
      "UR Platform LLC processes payments as a facilitator where applicable but does not guarantee creator performance, delivery, or refund policies.",
      "Contact the creator directly for creator-specific refund or return questions. UR support cannot override a creator's stated policy except where required by law.",
    ],
  },
  {
    id: "harassment",
    title: "Zero harassment — zero tolerance",
    bullets: [
      ZERO_HARASSMENT_POLICY,
      "This applies to all users, all roles, and all interaction types: AI chat, human messaging, social feed, live sessions, comments, and voice.",
      HARASSMENT_ENFORCEMENT_POLICY,
      "UR Platform LLC may remove content, restrict features, suspend, or permanently ban accounts at our sole discretion when harassment or abuse is detected or reported.",
      `Reporting harassment: contact ${TERMS_SUPPORT_EMAIL} with screenshots, usernames, and dates.`,
    ],
  },
  {
    id: "ai-disclaimer",
    title: "AI disclaimer",
    bullets: [
      "All AI specialists are artificial intelligence — not human professionals.",
      "AI output is for entertainment and educational purposes only, not medical, legal, tax, financial, or other licensed professional advice.",
      "Consult a qualified licensed expert when you need professional advice.",
      "The AI does not perform your work. You (the human) remain responsible for how you use what you learn on the job.",
    ],
  },
  {
    id: "human-conduct",
    title: "Human responsibility — not the AI, not the owner",
    bullets: [
      HUMAN_CONDUCT_POLICY,
      "Misuse, crime, sabotage, or unsafe shortcuts are the user's Terms violation. They are not actions of the AI and are not authorized by UR Platform LLC or the platform owner.",
      "UR Platform LLC may suspend or ban accounts that attempt forbidden use. That enforcement is against the human account holder.",
    ],
  },
  {
    id: "platform-role",
    title: "UR Platform role & limitation of liability",
    bullets: [
      PLATFORM_LIABILITY_SUMMARY,
      HUMAN_CONDUCT_POLICY,
      "The Platform is provided \"as is\" without warranties. UR Platform LLC is not liable for indirect, incidental, or consequential damages arising from Platform use.",
      "Users are responsible for their own conduct and compliance with applicable laws.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    bullets: [
      `${TERMS_BILLING_ENTITY} is a limited liability company formed in ${TERMS_HOME_STATE}.`,
      TERMS_GOVERNING_LAW,
      `Questions: ${TERMS_SUPPORT_EMAIL} · ${TERMS_PUBLIC_WEBSITE}`,
    ],
  },
  {
    id: "account-termination",
    title: "Account suspension & termination",
    bullets: [
      "UR Platform LLC may suspend or terminate any account for Terms violations, harassment, fraud, illegal activity, or any reason at our discretion.",
      "Upon termination for cause, all paid access may be forfeited without refund.",
      "Creators are independent and responsible for their own tax, earnings, and follower relationships.",
    ],
  },
];

/** Short lines for footers, banners, and checkout buttons. */
export const TERMS_CHECKOUT_ACKNOWLEDGMENT =
  "By completing this purchase you agree: AI/digital access is non-refundable. " +
  "Harassment on UR Platform results in revoked privileges with no refund. " +
  "Creator purchases are between you and the creator — UR Platform LLC is not responsible.";

export const TERMS_SIGNUP_ACKNOWLEDGMENT =
  "I agree to the UR Terms of Use — I am 18 or older and will complete ID front, ID back, and selfie verification before entering. " +
  "Zero tolerance for harassment (privileges revoked, no refunds if violated). No refunds on AI purchases.";

export function getTermsSection(id: string): TermsSection | undefined {
  return PLATFORM_TERMS_SECTIONS.find((s) => s.id === id);
}
