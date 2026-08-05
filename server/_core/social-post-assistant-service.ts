/**
 * Social Post Assistant — AI subscription for everyday users who want help posting
 * on the UR social feed without becoming content creators.
 * In-memory MVP (persist before production).
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { generateGoogleChatReply, isGoogleCloudAiConfigured } from "./google-ai";
import { sanitizeUserText } from "./input-sanitize";
import { SOCIAL_POST_ASSISTANT_SYSTEM_PROMPT } from "./multilingual-prompts";

export type PostAssistantPlan = "day" | "week" | "month" | "year";

export type PostAssistantSubscription = {
  id: string;
  userId: string;
  userEmail: string;
  plan: PostAssistantPlan;
  purchasedAt: string;
  expiresAt: string;
  assistsIncluded: number;
  assistsUsed: number;
  priceCents: number;
  active: boolean;
};

export const POST_ASSISTANT_PLANS: Record<
  PostAssistantPlan,
  { priceCents: number; assists: number; durationDays: number; label: string }
> = {
  day: { priceCents: 99, assists: 5, durationDays: 1, label: "Day pass" },
  week: { priceCents: 299, assists: 25, durationDays: 7, label: "Weekly" },
  month: { priceCents: 499, assists: 120, durationDays: 30, label: "Monthly" },
  year: { priceCents: 3999, assists: 1500, durationDays: 365, label: "Yearly" },
};

const subscriptions = new Map<string, PostAssistantSubscription>();

function findActiveSubscription(userId: string): PostAssistantSubscription | null {
  const now = Date.now();
  for (const sub of subscriptions.values()) {
    if (!sub.active || sub.userId !== userId) continue;
    if (new Date(sub.expiresAt).getTime() < now) continue;
    if (sub.assistsUsed >= sub.assistsIncluded) continue;
    return sub;
  }
  return null;
}

export function hasSocialPostAssistantAccess(userId: string, isPlatformOwner = false): boolean {
  if (isPlatformOwner) return true;
  return findActiveSubscription(userId) !== null;
}

export function getSocialPostAssistantStatus(userId: string, isPlatformOwner = false): {
  hasAccess: boolean;
  subscription: PostAssistantSubscription | null;
  assistsRemaining: number;
  plans: Array<{
    plan: PostAssistantPlan;
    label: string;
    priceUsd: string;
    assists: number;
    durationDays: number;
  }>;
} {
  const sub = findActiveSubscription(userId);
  const assistsRemaining = isPlatformOwner
    ? 999
    : sub
      ? Math.max(0, sub.assistsIncluded - sub.assistsUsed)
      : 0;

  return {
    hasAccess: isPlatformOwner || sub !== null,
    subscription: sub,
    assistsRemaining,
    plans: (Object.entries(POST_ASSISTANT_PLANS) as Array<[PostAssistantPlan, typeof POST_ASSISTANT_PLANS.day]>).map(
      ([plan, cfg]) => ({
        plan,
        label: cfg.label,
        priceUsd: (cfg.priceCents / 100).toFixed(2),
        assists: cfg.assists,
        durationDays: cfg.durationDays,
      }),
    ),
  };
}

export function purchaseSocialPostAssistant(params: {
  userId: string;
  userEmail: string;
  plan: PostAssistantPlan;
}): PostAssistantSubscription {
  const cfg = POST_ASSISTANT_PLANS[params.plan];
  if (!cfg) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid subscription plan." });
  }

  const expiresAt = new Date(Date.now() + cfg.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const subscription: PostAssistantSubscription = {
    id: randomUUID(),
    userId: params.userId,
    userEmail: params.userEmail.toLowerCase().trim(),
    plan: params.plan,
    purchasedAt: new Date().toISOString(),
    expiresAt,
    assistsIncluded: cfg.assists,
    assistsUsed: 0,
    priceCents: cfg.priceCents,
    active: true,
  };
  subscriptions.set(subscription.id, subscription);

  recordTransaction({
    type: "other",
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    amountCents: cfg.priceCents,
    description: `Social Post Assistant ${cfg.label} (${cfg.assists} assists)`,
    status: "completed",
    metadata: { subscriptionId: subscription.id, plan: params.plan, kind: "social_post_assistant" },
  });

  return subscription;
}

function consumeAssistCredit(userId: string, isPlatformOwner: boolean): PostAssistantSubscription | null {
  if (isPlatformOwner) return null;
  const sub = findActiveSubscription(userId);
  if (!sub) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Subscribe to Social Post Assistant to get AI help writing posts — no creator account needed. Plans start at $0.99/day.",
    });
  }
  sub.assistsUsed += 1;
  subscriptions.set(sub.id, sub);
  return sub;
}

export type PostTone = "casual" | "funny" | "heartfelt" | "professional" | "hype" | "question";

function buildTemplateDraft(prompt: string, tone?: PostTone): string {
  const lead = prompt.charAt(0).toUpperCase() + prompt.slice(1);
  const tags = "#URCommunity #URPlatform";
  switch (tone) {
    case "funny":
      return `${lead} 😄 — yes, I'm posting this on the internet. ${tags}`;
    case "heartfelt":
      return `Grateful moment: ${lead}. Thanks for being part of my circle. ${tags}`;
    case "professional":
      return `Quick update: ${lead}. ${tags}`;
    case "hype":
      return `🔥 ${lead.toUpperCase()} — let's go! ${tags}`;
    case "question":
      return `${lead}? Would love to hear your thoughts! ${tags}`;
    default:
      return `${lead} — sharing this on UR Platform! ${tags}`;
  }
}

export async function generateSocialPostDraft(params: {
  userId: string;
  userName: string;
  prompt: string;
  tone?: PostTone;
  isPlatformOwner: boolean;
}): Promise<{ draft: string; assistsRemaining: number; aiAssisted: true }> {
  const prompt = sanitizeUserText(params.prompt, 500);
  if (!prompt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tell the assistant what you want to post about." });
  }

  consumeAssistCredit(params.userId, params.isPlatformOwner);

  const tone = params.tone ?? "casual";
  let draft: string;

  if (!isGoogleCloudAiConfigured()) {
    draft = buildTemplateDraft(prompt, tone);
  } else {
    const toneLine = `Tone: ${tone}.`;
    const userMessage =
      `${toneLine}\n` +
      `User name: ${params.userName.slice(0, 80)}\n` +
      `Idea for my post: ${prompt}\n\n` +
      "Write the post body only — ready to paste into the social feed.";

    try {
      const { reply } = await generateGoogleChatReply({
        systemPrompt: SOCIAL_POST_ASSISTANT_SYSTEM_PROMPT,
        message: userMessage,
        history: [],
      });
      draft = reply.trim().slice(0, 4000);
    } catch {
      draft = buildTemplateDraft(prompt, tone);
    }
  }

  if (!draft) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate a post draft. Try again." });
  }

  const status = getSocialPostAssistantStatus(params.userId, params.isPlatformOwner);
  return { draft, assistsRemaining: status.assistsRemaining, aiAssisted: true };
}
