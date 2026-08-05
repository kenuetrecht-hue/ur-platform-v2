/**
 * AI sales pitch opt-in — ask before pitching; disclose AI + UR Platform commission after yes.
 */

import { PITCH_ACCEPT_DISCLOSURE } from "../../lib/platform-disclosure-copy";
import { applyAffiliateDisclosures } from "./affiliate-disclosure-service";

export type PitchConsentState = {
  userId: string;
  creatorId: string;
  status: "none" | "awaiting_response" | "accepted" | "declined";
  offeredAt?: string;
  respondedAt?: string;
};

const consentStore = new Map<string, PitchConsentState>();

function key(userId: string, creatorId: string): string {
  return `${userId}:${creatorId}`;
}

const PITCH_PATTERNS =
  /\b(subscribe|subscription|premium tier|\$\d+\/month|affiliate link|special offer|upgrade now|buy now|limited time offer|commission)\b/i;

const CONSENT_YES = /^(yes|yeah|yep|sure|ok|okay|please|show me|i'?d like to hear|accept)\b/i;
const CONSENT_NO = /^(no|nope|nah|decline|not now|skip|pass)\b/i;

export function getPitchConsent(userId: string, creatorId: string): PitchConsentState {
  return (
    consentStore.get(key(userId, creatorId)) ?? {
      userId,
      creatorId,
      status: "none",
    }
  );
}

export function buildPitchConsentAsk(creatorName: string): string {
  return (
    `Would you like to hear about a subscription, promotion, or special offer related to ${creatorName}? ` +
    `Reply **yes** or **no**. UR Platform may earn a commission if you purchase through an AI-suggested offer.`
  );
}

export function buildAcceptedPitchReply(params: {
  creatorName: string;
  topicHint?: string;
}): string {
  return (
    `**Important — please read before continuing:**\n\n` +
    `⚠️ ${PITCH_ACCEPT_DISCLOSURE}\n\n` +
    `---\n\n` +
    `Thank you for opting in. Here is an AI-generated offer from ${params.creatorName}:\n\n` +
    `• Access premium features and exclusive live sessions\n` +
    `• Priority responses and member-only content\n` +
    `• Support your favorite creators on UR Platform\n\n` +
    `This message is **not** from a human salesperson — it was written by an AI assistant. ` +
    `UR Platform retains a percentage of qualifying purchases.\n\n` +
    `Ask me any questions about the offer, or say **no thanks** to stop promotions for now.`
  );
}

export function markAwaitingPitchConsent(userId: string, creatorId: string): void {
  consentStore.set(key(userId, creatorId), {
    userId,
    creatorId,
    status: "awaiting_response",
    offeredAt: new Date().toISOString(),
  });
}

export function acceptPitchConsent(userId: string, creatorId: string): PitchConsentState {
  const state: PitchConsentState = {
    userId,
    creatorId,
    status: "accepted",
    respondedAt: new Date().toISOString(),
  };
  consentStore.set(key(userId, creatorId), state);
  return state;
}

export function declinePitchConsent(userId: string, creatorId: string): PitchConsentState {
  const state: PitchConsentState = {
    userId,
    creatorId,
    status: "declined",
    respondedAt: new Date().toISOString(),
  };
  consentStore.set(key(userId, creatorId), state);
  return state;
}

export function replyContainsUnsolicitedPitch(text: string): boolean {
  return PITCH_PATTERNS.test(text);
}

export function isConsentYesMessage(message: string): boolean {
  return CONSENT_YES.test(message.trim());
}

export function isConsentNoMessage(message: string): boolean {
  return CONSENT_NO.test(message.trim());
}

export function processPitchConsentFlow(params: {
  userId: string;
  creatorId: string;
  creatorName: string;
  userMessage: string;
  aiReply: string;
}): {
  reply: string;
  pitchConsentRequest?: boolean;
  pitchAccepted?: boolean;
  pitchDeclined?: boolean;
} {
  const consent = getPitchConsent(params.userId, params.creatorId);

  if (consent.status === "awaiting_response") {
    if (isConsentYesMessage(params.userMessage)) {
      acceptPitchConsent(params.userId, params.creatorId);
      return {
        reply: buildAcceptedPitchReply({ creatorName: params.creatorName }),
        pitchAccepted: true,
      };
    }
    if (isConsentNoMessage(params.userMessage)) {
      declinePitchConsent(params.userId, params.creatorId);
      return {
        reply:
          "Understood — I won't show subscription or promotional offers unless you ask. How else can I help?",
        pitchDeclined: true,
      };
    }
  }

  if (consent.status === "declined" && replyContainsUnsolicitedPitch(params.aiReply)) {
    return {
      reply: params.aiReply.replace(PITCH_PATTERNS, "[offer withheld — say yes to hear promotions]"),
    };
  }

  if (
    consent.status !== "accepted" &&
    replyContainsUnsolicitedPitch(params.aiReply)
  ) {
    markAwaitingPitchConsent(params.userId, params.creatorId);
    return {
      reply: buildPitchConsentAsk(params.creatorName),
      pitchConsentRequest: true,
    };
  }

  if (consent.status === "accepted" && replyContainsUnsolicitedPitch(params.aiReply)) {
    const wrapped = applyAffiliateDisclosures(
      `⚠️ ${PITCH_ACCEPT_DISCLOSURE}\n\n` +
        params.aiReply +
        `\n\n*(AI-generated promotional content — UR Platform may receive a commission.)*`,
      "text",
    );
    return {
      reply: wrapped.text,
      pitchAccepted: true,
    };
  }

  const plain = applyAffiliateDisclosures(params.aiReply, "text");
  return { reply: plain.text };
}

export const AI_PITCH_SYSTEM_RULE = `
## Sales & promotions (mandatory)
- NEVER deliver a subscription pitch, price, affiliate link, or "buy/subscribe now" CTA without first asking:
  "Would you like to hear about a subscription or promotion? (yes/no)"
- Wait for the user's yes/no before any sales content.
- If they say yes, begin with: this is an AI-generated offer and UR Platform receives a commission on qualifying purchases.
- If they say no, do not pitch again unless they ask.
- Any affiliate or ad link MUST have the before-link and after-link disclosure (see affiliate rules).
`.trim();
