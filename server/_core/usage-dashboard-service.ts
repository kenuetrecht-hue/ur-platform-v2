/**
 * One used-vs-left dashboard for every paid UR product the user owns.
 */

import { CREDIT_PRODUCTS, type CreditProductId } from "../../lib/usage-caps-catalog";
import {
  buildUsageLotTrackerView,
  formatUsedLeftLine,
  type UsageLotTrackerView,
  USAGE_TRACKER_HEADLINE,
} from "../../lib/usage-lot-tracker";
import { getActiveAiSubscription } from "./ai-subscription-service";
import { getConcurrentSlotQuote } from "./ai-platform-pass-slots";
import { getAiUsageStatus } from "./ai-usage-meter";
import { getTalkTimeStatus } from "./ai-talk-time-tracker";
import { getAllCreditBalances, getIncludedWebSearchRemaining } from "./usage-credits-service";
import { getActiveWorkspace3dSubscription } from "./workspace-3d-subscription-service";
import { getWorkspace3dPlanLabel } from "../../lib/workspace-3d-pricing";

export type UsageDashboardItem = {
  id: string;
  kind: "text" | "credit" | "talk" | "slot" | "workspace" | "search";
  title: string;
  usedLeftLine: string;
  loseByLabel: string;
  lowBalance: boolean;
  lots: UsageLotTrackerView[];
};

export type UsageDashboard = {
  headline: string;
  items: UsageDashboardItem[];
};

export function getUsageDashboard(params: {
  userId: string;
  email?: string | null;
  creatorId?: string;
  isPlatformOwner: boolean;
}): UsageDashboard {
  const items: UsageDashboardItem[] = [];
  const creatorId = params.creatorId ?? "ai-wellness-001";

  const sub = getActiveAiSubscription(params.userId, creatorId);
  if (sub) {
    const usage = getAiUsageStatus({
      userId: params.userId,
      email: params.email,
      creatorId,
      isPlatformOwner: params.isPlatformOwner,
    });
    const lot = buildUsageLotTrackerView({
      id: sub.id,
      productId: "text-pass",
      productLabel: "Text pass (all specialists)",
      unit: "messages",
      included: usage.messagesIncluded,
      used: usage.messagesUsed,
      expiresAt: sub.expiresAt,
    });
    items.push({
      id: "text-pass",
      kind: "text",
      title: "Text pass",
      usedLeftLine: formatUsedLeftLine({
        used: usage.messagesUsed,
        included: usage.messagesIncluded,
        remaining: usage.messagesRemaining,
        unit: "messages",
      }),
      loseByLabel: lot.loseByLabel,
      lowBalance: lot.lowBalance,
      lots: [lot],
    });

    const slots = getConcurrentSlotQuote(params.userId);
    const extraLot = buildUsageLotTrackerView({
      id: "concurrent-slots",
      productId: "concurrent-slot",
      productLabel: "Concurrent AI slots",
      unit: "slots",
      included: slots.maxSlots,
      used: Math.max(0, slots.activeCreatorIds.length),
      expiresAt: slots.extrasExpireAt ?? sub.expiresAt,
    });
    items.push({
      id: "concurrent-slots",
      kind: "slot",
      title: "Concurrent AIs",
      usedLeftLine: `Talking to ${slots.activeCreatorIds.length} of ${slots.maxSlots} at once · ${slots.includedSlots} included${slots.extraSlots > 0 ? ` + ${slots.extraSlots} extra` : ""}`,
      loseByLabel: extraLot.loseByLabel,
      lowBalance: false,
      lots: [extraLot],
    });

    const searchLeft = getIncludedWebSearchRemaining(params.userId, creatorId);
    const searchUsed = Math.max(0, 10 - searchLeft);
    const searchLot = buildUsageLotTrackerView({
      id: "included-web-search",
      productId: "search-web-included",
      productLabel: "Included web searches today",
      unit: "searches",
      included: 10,
      used: searchUsed,
      expiresAt: sub.expiresAt,
    });
    items.push({
      id: "included-web-search",
      kind: "search",
      title: "Web searches today",
      usedLeftLine: formatUsedLeftLine({
        used: searchUsed,
        included: 10,
        remaining: searchLeft,
        unit: "searches",
      }),
      loseByLabel: "Resets each UTC day while your text pass is active",
      lowBalance: searchLot.lowBalance,
      lots: [searchLot],
    });
  }

  for (const balance of getAllCreditBalances(params.userId)) {
    if (balance.included <= 0) continue;
    items.push({
      id: balance.productId,
      kind: "credit",
      title: CREDIT_PRODUCTS[balance.productId as CreditProductId].label,
      usedLeftLine: balance.usedLeftLine,
      loseByLabel:
        balance.lots[0]?.loseByLabel ??
        (balance.expiresAt ? `Use by ${new Date(balance.expiresAt).toLocaleDateString()}` : "No expiry"),
      lowBalance: balance.lots.some((lot) => lot.lowBalance) || balance.remaining <= 1,
      lots: balance.lots,
    });
  }

  const talk = getTalkTimeStatus(params.userId);
  if (talk.millisecondsIncluded > 0) {
    const talkLots = talk.lots.map((lot) =>
      buildUsageLotTrackerView({
        id: lot.id,
        productId: String(lot.packId),
        productLabel: lot.tracker.packLabel,
        unit: "talk minutes",
        included: Math.round(lot.millisecondsIncluded / 60_000),
        used: Math.round(lot.millisecondsUsed / 60_000),
        expiresAt: lot.expiresAt,
      }),
    );
    items.push({
      id: "voice-talk",
      kind: "talk",
      title: "Voice talk time",
      usedLeftLine: formatUsedLeftLine({
        used: Math.round(talk.millisecondsUsed / 60_000),
        included: Math.round(talk.millisecondsIncluded / 60_000),
        remaining: talk.minutesRemainingDisplay,
        unit: "talk minutes",
      }),
      loseByLabel: talk.lots[0]?.tracker.loseByLabel ?? "Unused talk time is lost after 30 days",
      lowBalance: talk.millisecondsRemaining > 0 && talk.millisecondsRemaining <= 5 * 60_000,
      lots: talkLots,
    });
  }

  const workspace = getActiveWorkspace3dSubscription(params.userId);
  if (workspace) {
    const lot = buildUsageLotTrackerView({
      id: workspace.id,
      productId: "workspace-3d",
      productLabel: getWorkspace3dPlanLabel(workspace.plan),
      unit: "concurrent AI slots",
      included: workspace.concurrentAiSlots + workspace.extraAiSlots,
      used: 0,
      expiresAt: workspace.expiresAt,
    });
    items.push({
      id: "workspace-3d",
      kind: "workspace",
      title: "3D workspace",
      usedLeftLine: `${workspace.concurrentAiSlots + workspace.extraAiSlots} concurrent AI slots · ${getWorkspace3dPlanLabel(workspace.plan)}`,
      loseByLabel: lot.loseByLabel,
      lowBalance: false,
      lots: [lot],
    });
  }

  return {
    headline: USAGE_TRACKER_HEADLINE,
    items,
  };
}
