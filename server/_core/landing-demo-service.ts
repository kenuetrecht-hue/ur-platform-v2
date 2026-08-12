/**
 * Public landing-page demo — one free AI message per IP (process lifetime).
 */

import { TRPCError } from "@trpc/server";
import {
  LANDING_DEMO_MESSAGE_MAX,
  LANDING_DEMO_REPLY_MAX,
  LANDING_DEMO_CREATOR_IDS,
  type LandingDemoCreatorId,
  truncateLandingDemoReply,
} from "../../lib/landing-demo-policy";
import { handleCreatorAiChat } from "./ai-chat-handler";
import { isCreatorAiId } from "./ai-creator-registry";
import { getTownHallPanelPreview } from "./hive-town-hall-service";

export {
  LANDING_DEMO_MESSAGE_MAX,
  LANDING_DEMO_REPLY_MAX,
  LANDING_DEMO_VOICE_TEXT_MAX,
  LANDING_DEMO_CREATOR_IDS,
  type LandingDemoCreatorId,
} from "../../lib/landing-demo-policy";

const demoUsedByIp = new Set<string>();
const voiceUsedByIp = new Set<string>();

function normalizeIp(ip: string | undefined): string {
  return (ip ?? "unknown").trim() || "unknown";
}

function assertDemoNotUsed(ip: string): void {
  if (demoUsedByIp.has(normalizeIp(ip))) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You already used your free demo message. Create an account for unlimited access.",
    });
  }
}

export function markDemoUsed(ip: string): void {
  demoUsedByIp.add(normalizeIp(ip));
}

export function hasUsedDemo(ip: string): boolean {
  return demoUsedByIp.has(normalizeIp(ip));
}

export function canUseDemoVoice(ip: string): boolean {
  return !voiceUsedByIp.has(normalizeIp(ip));
}

export function markDemoVoiceUsed(ip: string): void {
  voiceUsedByIp.add(normalizeIp(ip));
}

export function isLandingDemoCreator(id: string): id is LandingDemoCreatorId {
  return (LANDING_DEMO_CREATOR_IDS as readonly string[]).includes(id);
}

export async function runLandingDemoChat(params: {
  creatorId: string;
  message: string;
  ip: string;
}) {
  if (!isLandingDemoCreator(params.creatorId) || !isCreatorAiId(params.creatorId)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That specialist is not available for demo." });
  }

  assertDemoNotUsed(params.ip);

  const guestUserId = `landing:${normalizeIp(params.ip)}`;

  const result = await handleCreatorAiChat({
    creatorId: params.creatorId,
    message: params.message.slice(0, LANDING_DEMO_MESSAGE_MAX),
    history: [],
    useHiveConsult: false,
    ctx: {
      userId: guestUserId,
      isPlatformOwner: false,
      userEmail: null,
      landingDemo: true,
    },
  });

  markDemoUsed(params.ip);

  return {
    ...result,
    reply: truncateLandingDemoReply(result.reply, LANDING_DEMO_REPLY_MAX),
    demoUsed: true,
    signupRequired: true,
  };
}

export function getLandingPublicStats() {
  const basePoints = 128_450;
  const basePayoutsUsd = 24_680;
  const jitter = Math.floor((Date.now() / 60_000) % 37);

  return {
    loyaltyPointsAwarded: basePoints + jitter * 12,
    affiliatePayoutsUsd: basePayoutsUsd + jitter * 3,
    activeCreators: 312 + (jitter % 9),
    aiSpecialists: 44,
    townHallSessionsToday: 18 + (jitter % 5),
    updatedAt: new Date().toISOString(),
    disclaimer:
      "Live counters combine platform activity with illustrative growth metrics for the landing preview.",
  };
}

export function getLandingTownHallPreview() {
  const specialists = getTownHallPanelPreview({
    mode: "recommended",
    seedMessage: "How do we launch a marina service and AI hive together?",
  });

  const simulation = [
    {
      speaker: "Marina Mechanic AI",
      avatar: "⚓",
      line: "Start with fuel dock safety checklist and winterization workflow.",
    },
    {
      speaker: "AI Business Advisor",
      avatar: "📊",
      line: "Model slip pricing, seasonal storage, and affiliate referral tiers.",
    },
    {
      speaker: "Electrician Expert AI",
      avatar: "⚡",
      line: "Shore power panels need GFCI and corrosion inspection on every haul-out.",
    },
    {
      speaker: "LinguaMate",
      avatar: "🌍",
      line: "Every specialist speaks your language — teach, translate, and learn on one platform.",
    },
    {
      speaker: "ContentMate",
      avatar: "✨",
      line: "I'll draft marina promo posts and creator onboarding sequences.",
    },
  ];

  return { panel: { specialists }, simulation };
}

export function _resetLandingDemoUsageForTests(): void {
  demoUsedByIp.clear();
  voiceUsedByIp.clear();
}
