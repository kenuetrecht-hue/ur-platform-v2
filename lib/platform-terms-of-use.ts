/**
 * UR Platform Terms of Use — plain-language sections for UI, checkout, and legal reference.
 * Effective Sep 2026. Billed by UR Platform LLC, an Indiana limited liability company.
 */

export const TERMS_EFFECTIVE_DATE = "September 1, 2026";
/** Bump this when conduct rules change — every member must re-check the box. */
export const CONDUCT_RULES_VERSION = "2026-09-01";
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
  "All UR digital packages are final once the purchase goes through. That includes AI specialist subscriptions, " +
  "usage credits, Talk Time, UR World apparel and City Wallet packs, 3D workspace access, and every other digital " +
  "package sold by UR Platform LLC. No returns and no refunds — including unused messages, credits, minutes, or locker items. " +
  "Do not ask for a refund after checkout. You must check the no-refund box before the purchase is completed. " +
  "That check is saved and timestamped.";

export const CREATOR_TRANSACTION_DISCLAIMER =
  "Purchases from individual content creators (live classes, creator shop items, tips, or creator-specific offers) " +
  "are between you and that creator. UR Platform is not a party to those transactions and is not responsible for " +
  "creator refunds, returns, chargebacks, or disputes. Any return policy a creator offers must be stated by that creator " +
  "and enforced by that creator — not by UR Platform.";

export const COMMUNITY_PURPOSE_POLICY =
  "UR Platform is here to have fun, to learn, to educate each other, and to be friendly. " +
  "Treat every member, specialist, and staff person with respect in chat, Talk, UR World, social posts, and voice.";

export const ZERO_HARASSMENT_POLICY =
  "Zero tolerance for harassment, hate groups, and negative behavior. No bullying, threats, stalking, hate speech, " +
  "hate-group organizing, sexual harassment, or targeted abuse of any person — in chat, social posts, messages, voice, " +
  "UR World, or any other UR feature — will be tolerated.";

export const HARASSMENT_ENFORCEMENT_POLICY =
  "If you are found harassing others, supporting a hate group, or otherwise not following these rules, you will be asked to leave the platform. " +
  "Your account may be suspended or banned immediately. All money you invested in UR packages is forfeited. No refunds. " +
  "If the conduct may be a crime, UR Platform LLC will turn it over to the authorities to be investigated and will cooperate to the fullest.";

export const COMMUNICATIONS_AUDIT_POLICY =
  "When you communicate with others inside UR Platform (chat, Talk, messages, social posts, UR World), UR copies and saves that communication. " +
  "Each record is timestamped. For the platform owner's review, a plain-English translation is stored next to the original. " +
  "This is how UR stays covered and checks that members follow procedure. Do not use UR if you do not agree to this record.";

export const LAW_ENFORCEMENT_COOPERATION_POLICY =
  "UR Platform LLC cooperates fully with law enforcement. If harassment, threats, fraud, or other conduct may give rise to criminal charges, " +
  "the matter will be turned over to the authorities to be investigated. Saved, timestamped records (including English translations) may be produced as required by law.";

export const TERMS_CHANGE_POLICY =
  "These rules and regulations are subject to change at any time. When they change, you must read the new version and check the box again before you keep using UR. " +
  "Continued use after a change means you agree to the updated terms.";

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
      "This check keeps fraud off the website and locks creator identity so videos, classes, and posts stay with the creator who made them — not anyone who copies them.",
      "This gate also exists because AI chat, social features, and paid access can be addictive for minors.",
      "UR Platform does not keep the ID pictures. Google’s AI checker looks at the photos only to confirm you are 18+ and that the selfie matches the ID. We store pass/fail and one-way image hashes, not reusable copies of your ID.",
      "UR Platform LLC does not sell your information and does not give it away to marketers. We share it only when the law requires it.",
      "If we learn that someone stole account information, we notify you immediately on this website and queue the same notice for the email on your account.",
      "Failing the check, using someone else's ID, or a photo-of-a-photo selfie is a Terms violation. The account cannot enter.",
    ],
  },
  {
    id: "ai-no-refunds",
    title: "Digital packages — no returns, no refunds",
    bullets: [
      AI_PURCHASE_NO_REFUND_POLICY,
      "This applies to text subscriptions, image credits, code sandbox runs, book/chapter credits, web search packs, hive consults, voice talk time, 3D workspace access, and all other AI or platform digital access sold by UR Platform LLC.",
      "Expired or unused allowances are forfeited. Partial use does not entitle you to a refund.",
      "Chargebacks or payment disputes on AI purchases may result in immediate account suspension without refund.",
    ],
  },
  {
    id: "talk-and-text-passes",
    title: "Text pass and Talk Time — what you buy, how long it lasts",
    bullets: [
      "Text pass ($7.99 / 24 hours, $15.99 / 7 days, $24.99 / 30 days): you pay for a set number of text messages with every UR specialist, one AI at a time. Typed chat = 1 message. Microphone print = 1 message. Send after the mic = 1 more. Learn = 5. Hive = 3. Photo = 2. Hear (the AI speaking back) is not included.",
      "When the text pass ends, leftover messages are gone. When the messages are used up, chat stops until you buy another pass. No rollover. No refunds.",
      "Talk Time is Hear / video only — the AI speaking back to you. $1 = 5 minutes (use within 30 days). $5 = 20 minutes, app only (use within 30 days). $120 = 500 minutes, web (use within 90 days). $200 = 1,000 minutes, web (use within 90 days). Unused minutes from that purchase are forfeited when the clock ends.",
      "You cannot hold more than 1,000 unused Talk minutes at one time. UR will not sell more Talk Time until you use some down. This is to prevent stockpiling unused minutes against a later bill.",
      "The Talk microphone that prints your words uses the text pass, not Talk Time minutes. Minutes run only while you are connected and the AI is speaking.",
      "You must check the box at checkout agreeing to these rules. That check is saved with the full rule text, a version number, and a timestamp.",
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
      "UR Platform LLC may remove content, restrict features, suspend, or permanently ban accounts at our sole discretion when harassment, hate, or abuse is detected or reported.",
      `Reporting harassment: contact ${TERMS_SUPPORT_EMAIL} with screenshots, usernames, and dates.`,
    ],
  },
  {
    id: "community-conduct",
    title: "How we treat each other",
    bullets: [
      COMMUNITY_PURPOSE_POLICY,
      ZERO_HARASSMENT_POLICY,
      HARASSMENT_ENFORCEMENT_POLICY,
      "Everyone who uses UR must sign these rules by checking the box. Unsigned accounts cannot chat, post, Talk, or buy packages.",
    ],
  },
  {
    id: "communications-audit",
    title: "Communications are saved, copied, timestamped, and translated to English",
    bullets: [
      COMMUNICATIONS_AUDIT_POLICY,
      "The platform owner reviews the English copy to make sure everything is in procedure. Original language is kept next to the English text.",
      "This record exists to protect UR Platform LLC, members, and investigators if a dispute or crime is alleged.",
    ],
  },
  {
    id: "law-enforcement",
    title: "Cooperation with authorities",
    bullets: [
      LAW_ENFORCEMENT_COOPERATION_POLICY,
      "Do not use UR to plan, support, or hide criminal activity. That is a Terms violation by the human account holder.",
    ],
  },
  {
    id: "changes",
    title: "Rules may change at any time",
    bullets: [
      TERMS_CHANGE_POLICY,
      `Current conduct version: ${CONDUCT_RULES_VERSION}. Effective ${TERMS_EFFECTIVE_DATE}.`,
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
      "Upon termination for cause — including harassment, hate-group activity, or other rule violations — all paid access is forfeited without refund.",
      "Creators are independent and responsible for their own tax, earnings, and follower relationships.",
    ],
  },
];

/** Short lines for footers, banners, and checkout buttons. */
export const TERMS_CHECKOUT_ACKNOWLEDGMENT =
  "I checked the box: this purchase is final. No refunds. Do not ask for a refund after it goes through. " +
  "This check is saved and timestamped. Harassment, hate groups, or breaking UR rules means I am asked to leave and all money invested is forfeited, with no refund. " +
  "Creator purchases are between me and the creator — UR Platform LLC is not responsible.";

export const TERMS_SIGNUP_ACKNOWLEDGMENT =
  "I agree to the UR Terms of Use — I am 18 or older and will complete ID front, ID back, and selfie verification before entering. " +
  "That check is to stop fraud and to keep creator content with the creator who made it. UR does not keep the ID pictures. " +
  "UR does not sell my information. If account information is stolen, UR notifies me on this website. " +
  "We are here to have fun, learn, educate each other, and be friendly. No hate groups and no harassment. " +
  "If I break these rules I will be asked to leave and all money invested is forfeited with no refunds. " +
  "Communications inside UR are saved, timestamped, and translated to English for owner review. " +
  "UR cooperates fully with the authorities. Rules may change at any time. No refunds on digital packages.";

export const CONDUCT_CHECKBOX_LABEL =
  "I have read these rules. I check this box to sign them. I understand communications inside UR are saved, copied, timestamped, and translated to English. " +
  "I understand there are no refunds. I understand hate, harassment, or criminal conduct means I leave the platform, money is forfeited, and UR may turn the matter over to the authorities. " +
  "I understand these rules can change at any time and I will need to check the box again.";

export const PURCHASE_NO_REFUND_CHECKBOX_LABEL =
  "I understand this purchase is final. No refunds. Once it goes through I will not ask for a refund. This check is saved and timestamped so UR is protected in a dispute.";

export const CONDUCT_UNSIGNED_MESSAGE =
  "Check the box to sign the UR rules before you chat, post, Talk, or buy packages.";

export const PURCHASE_NO_REFUND_REQUIRED_MESSAGE =
  "Check the box to confirm this purchase is final. No refunds after checkout.";

export function getTermsSection(id: string): TermsSection | undefined {
  return PLATFORM_TERMS_SECTIONS.find((s) => s.id === id);
}

export function listConductRuleBullets(): string[] {
  return [
    COMMUNITY_PURPOSE_POLICY,
    ZERO_HARASSMENT_POLICY,
    HARASSMENT_ENFORCEMENT_POLICY,
    AI_PURCHASE_NO_REFUND_POLICY,
    COMMUNICATIONS_AUDIT_POLICY,
    LAW_ENFORCEMENT_COOPERATION_POLICY,
    TERMS_CHANGE_POLICY,
  ];
}
