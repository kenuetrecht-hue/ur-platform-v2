/**
 * Creator dashboard analytics, promo copy, and social share helpers.
 */

import { CREATOR_PAYOUT_SHARE } from "./creator-payout-service";
import { getCreatorPayoutProfile } from "./creator-payout-service";
import { getContentCreatorProfile } from "./partner-program-service";
import { listAllTransactions, getTransactionStats } from "./transaction-ledger-service";
import { getLiveSession, listLiveSessions, type AiLiveSession } from "./ai-live-session-service";
import { getPlatformPublicOrigin } from "../../lib/platform-urls";

function appBaseUrl(): string {
  return getPlatformPublicOrigin();
}

export function buildCreatorShareText(params: {
  displayName: string;
  customUrl: string;
}): string {
  return `🎬 Join my live AI classes on UR Platform!\n\nBook a session with me: ${params.customUrl}\n\n#URPlatform #LiveClasses #ContentCreator`;
}

export function buildClassShareText(params: {
  displayName: string;
  session: AiLiveSession;
}): string {
  const when = new Date(params.session.startsAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const ticket = (params.session.priceCents / 100).toFixed(2);
  const classUrl = `${appBaseUrl()}/live-session/${params.session.id}`;
  return (
    `🔴 LIVE CLASS with ${params.session.creatorName}\n` +
    `Hosted by ${params.displayName}\n\n` +
    `📅 ${when} · ${params.session.committedDurationMinutes} min\n` +
    `🎟 $${ticket} · ${params.session.title}\n\n` +
    `Get your ticket: ${classUrl}\n\n` +
    `#URPlatform #LiveClass #${params.session.creatorName.replace(/\s/g, "")}`
  );
}

export function buildFacebookPromoDraft(params: {
  displayName: string;
  customUrl: string;
  upcomingClass?: AiLiveSession | null;
}): string {
  if (params.upcomingClass) {
    const when = new Date(params.upcomingClass.startsAt).toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const ticket = (params.upcomingClass.priceCents / 100).toFixed(2);
    const classUrl = `${appBaseUrl()}/live-session/${params.upcomingClass.id}`;
    return (
      `Hey friends! 👋\n\n` +
      `I'm hosting a live class with ${params.upcomingClass.creatorName} on UR Platform.\n\n` +
      `📅 ${when}\n` +
      `⏱ ${params.upcomingClass.committedDurationMinutes} minutes\n` +
      `🎟 $${ticket}\n\n` +
      `${params.upcomingClass.title}\n\n` +
      `Grab your spot here: ${classUrl}\n\n` +
      `See you there! — ${params.displayName}`
    );
  }
  return (
    `Hey everyone! 👋\n\n` +
    `I'm now hosting paid live AI classes on UR Platform. Book a session with me and learn from ` +
    `world-class AI specialists — live, interactive, and affordable.\n\n` +
    `Check out my creator page: ${params.customUrl}\n\n` +
    `— ${params.displayName}`
  );
}

export function getCreatorAnalytics(userId: string) {
  const profile = getContentCreatorProfile(userId);
  const txStats = getTransactionStats(userId);
  const payout = getCreatorPayoutProfile(userId);
  const classes = listLiveSessions().filter((s) => s.hostUserId === userId);
  const upcoming = classes.filter((s) => s.status === "scheduled" || s.status === "live");
  const completed = classes.filter((s) => s.status === "ended");
  const totalTicketsSold = classes.reduce((sum, s) => sum + s.attendeeCount, 0);
  const totalCapacity = classes.reduce((sum, s) => sum + s.maxAttendees, 0);
  const fillRate =
    totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

  const recentSales = listAllTransactions({ userId, limit: 100 }).filter(
    (t) => t.payeeUserId === userId && t.type === "live_class_ticket",
  );
  const last30Days = recentSales.filter(
    (t) => Date.now() - Date.parse(t.createdAt) < 30 * 24 * 60 * 60 * 1000,
  );
  const earnings30dCents = last30Days.reduce((s, t) => s + t.amountCents, 0);
  const creatorShareCents = Math.round(txStats.totalVolumeCents * CREATOR_PAYOUT_SHARE);

  return {
    totalEarningsCents: profile?.totalEarningsCents ?? 0,
    creatorShareCents,
    platformFeeCents: txStats.totalVolumeCents - creatorShareCents,
    totalPaidOutCents: payout.totalPaidOutCents,
    pendingPayoutCents: payout.pendingBalanceCents,
    transactionCount: profile?.transactionCount ?? 0,
    totalClasses: classes.length,
    upcomingClasses: upcoming.length,
    completedClasses: completed.length,
    totalTicketsSold,
    fillRatePercent: fillRate,
    earnings30dCents,
    creatorSharePercent: Math.round(CREATOR_PAYOUT_SHARE * 100),
  };
}

export function getClassSharePayload(userId: string, sessionId: string) {
  const session = getLiveSession(sessionId);
  if (!session) return null;
  if (session.hostUserId !== userId) return null;
  const profile = getContentCreatorProfile(userId);
  const displayName = profile?.displayName ?? "Creator";
  const classUrl = `${appBaseUrl()}/live-session/${session.id}`;
  const shareText = buildClassShareText({ displayName, session });
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(classUrl)}&quote=${encodeURIComponent(shareText.slice(0, 500))}`;
  return {
    sessionId: session.id,
    classUrl,
    shareText,
    facebookShareUrl: facebookUrl,
    title: session.title,
    status: session.status,
  };
}

export function getCreatorPromoPayload(userId: string) {
  const profile = getContentCreatorProfile(userId);
  if (!profile) return null;
  const classes = listLiveSessions()
    .filter((s) => s.hostUserId === userId && (s.status === "scheduled" || s.status === "live"))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const upcomingClass = classes[0] ?? null;
  const shareText = buildCreatorShareText({
    displayName: profile.displayName,
    customUrl: profile.customUrl,
  });
  const facebookPost = buildFacebookPromoDraft({
    displayName: profile.displayName,
    customUrl: profile.customUrl,
    upcomingClass,
  });
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profile.customUrl)}&quote=${encodeURIComponent(facebookPost.slice(0, 500))}`;
  return {
    customUrl: profile.customUrl,
    shareText,
    facebookPost,
    facebookShareUrl: facebookUrl,
    upcomingClassTitle: upcomingClass?.title ?? null,
  };
}
