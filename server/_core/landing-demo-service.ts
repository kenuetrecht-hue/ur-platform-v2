/**
 * Public landing-page demo — one free AI message per IP per 24h (server enforced).
 */

import { TRPCError } from "@trpc/server";
import { handleCreatorAiChat } from "./ai-chat-handler";
import { isCreatorAiId } from "./ai-creator-registry";
import { getTownHallPanelPreview } from "./hive-town-hall-service";

const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
const DEMO_MESSAGE_MAX = 280;

/** Public specialists allowed on the homepage test drive. */
export const LANDING_DEMO_CREATOR_IDS = [
  "ai-marina-mechanic-001",
  "contentmate",
  "linguamate",
  "ai-wellness-001",
  "ai-3d-specialist",
] as const;

export type LandingDemoCreatorId = (typeof LANDING_DEMO_CREATOR_IDS)[number];

const demoUsedByIp = new Map<string, number>();
const voiceUsedByIp = new Map<string, number>();

function normalizeIp(ip: string | undefined): string {
  return (ip ?? "unknown").trim() || "unknown";
}

function assertDemoNotUsed(ip: string): void {
  const key = normalizeIp(ip);
  const usedAt = demoUsedByIp.get(key);
  if (usedAt && Date.now() - usedAt < DEMO_TTL_MS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You already used your free demo message. Create an account for unlimited access.",
    });
  }
}

export function markDemoUsed(ip: string): void {
  demoUsedByIp.set(normalizeIp(ip), Date.now());
}

export function hasUsedDemo(ip: string): boolean {
  const usedAt = demoUsedByIp.get(normalizeIp(ip));
  return Boolean(usedAt && Date.now() - usedAt < DEMO_TTL_MS);
}

export function canUseDemoVoice(ip: string): boolean {
  const usedAt = voiceUsedByIp.get(normalizeIp(ip));
  return !usedAt || Date.now() - usedAt >= DEMO_TTL_MS;
}

export function markDemoVoiceUsed(ip: string): void {
  voiceUsedByIp.set(normalizeIp(ip), Date.now());
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
    message: params.message.slice(0, DEMO_MESSAGE_MAX),
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
      speaker: "Platform Doctor AI",
      avatar: "🩺",
      line: "If you go through and look, you'll see that every single one of us is running on the same platform.",
    },
    {
      speaker: "ContentMate",
      avatar: "✨",
      line: "I'll draft marina promo posts and creator onboarding sequences.",
    },
  ];

  return { panel: { specialists }, simulation };
}
