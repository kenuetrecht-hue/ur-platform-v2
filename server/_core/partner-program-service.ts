/**
 * Content creator & affiliate partner program.
 * - Creators host paid classes (tracked transactions).
 * - Affiliates earn $5 when a referred creator completes their 5th transaction.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  getOrCreateUserLink,
  setUserLinkRole,
  resolveUserLink,
  buildCustomUrl,
  buildSignupUrlFromSlug,
} from "./user-link-service";
import { recordTransaction, listAllTransactions } from "./transaction-ledger-service";
import { processInstantCreatorPayout } from "./creator-payout-service";
import {
  mapContentProtectionError,
  registerCreatorIdentity,
} from "./creator-content-protection-service";

export const AFFILIATE_BONUS_CENTS = 500;
export const AFFILIATE_PAYOUT_AFTER_TRANSACTIONS = 5;

export type ContentCreatorProfile = {
  userId: string;
  userEmail: string;
  displayName: string;
  customSlug: string;
  customUrl: string;
  enrolledAt: string;
  referredByAffiliateUserId?: string;
  referredByAffiliateCode?: string;
  transactionCount: number;
  affiliateBonusPaid: boolean;
  totalEarningsCents: number;
};

export type AffiliateProfile = {
  userId: string;
  userEmail: string;
  displayName: string;
  referralCode: string;
  customSlug: string;
  customUrl: string;
  enrolledAt: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalBonusesPaidCents: number;
  pendingBonusCents: number;
};

export type AffiliateReferralRecord = {
  creatorUserId: string;
  creatorEmail: string;
  creatorName: string;
  referredAt: string;
  transactionCount: number;
  bonusPaid: boolean;
  bonusPaidAt?: string;
};

const creators = new Map<string, ContentCreatorProfile>();
const affiliates = new Map<string, AffiliateProfile>();
const referralCodeIndex = new Map<string, string>();
const affiliateReferrals = new Map<string, AffiliateReferralRecord[]>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function generateReferralCode(displayName: string): string {
  const base = displayName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "UR";
  let code = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  while (referralCodeIndex.has(code)) {
    code = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
  return code;
}

export function resolveAffiliateReferralCode(code: string): AffiliateProfile | null {
  const normalized = code.trim().toUpperCase();
  const byCode = referralCodeIndex.get(normalized);
  if (byCode) return affiliates.get(byCode) ?? null;
  const link = resolveUserLink(code);
  if (link?.role === "affiliate") {
    return affiliates.get(link.userId) ?? null;
  }
  return null;
}

export function enrollContentCreator(params: {
  userId: string;
  userEmail: string;
  displayName: string;
  referralCode?: string;
}): ContentCreatorProfile {
  const existing = creators.get(params.userId);
  if (existing) return existing;

  try {
    registerCreatorIdentity({
      userId: params.userId,
      displayName: params.displayName,
    });
  } catch (error) {
    mapContentProtectionError(error);
  }

  let referredByAffiliateUserId: string | undefined;
  let referredByAffiliateCode: string | undefined;
  if (params.referralCode) {
    const affiliate = resolveAffiliateReferralCode(params.referralCode);
    if (affiliate) {
      referredByAffiliateUserId = affiliate.userId;
      referredByAffiliateCode = affiliate.referralCode;
    }
  }

  const link = getOrCreateUserLink({
    userId: params.userId,
    userEmail: params.userEmail,
    displayName: params.displayName,
    role: "creator",
  });

  const profile: ContentCreatorProfile = {
    userId: params.userId,
    userEmail: normalizeEmail(params.userEmail),
    displayName: params.displayName,
    customSlug: link.slug,
    customUrl: link.customUrl,
    enrolledAt: new Date().toISOString(),
    referredByAffiliateUserId,
    referredByAffiliateCode,
    transactionCount: 0,
    affiliateBonusPaid: false,
    totalEarningsCents: 0,
  };
  creators.set(params.userId, profile);

  if (referredByAffiliateUserId) {
    const affiliate = affiliates.get(referredByAffiliateUserId);
    if (affiliate) {
      affiliate.totalReferrals += 1;
      affiliates.set(referredByAffiliateUserId, affiliate);
    }
    const list = affiliateReferrals.get(referredByAffiliateUserId) ?? [];
    list.push({
      creatorUserId: params.userId,
      creatorEmail: profile.userEmail,
      creatorName: profile.displayName,
      referredAt: profile.enrolledAt,
      transactionCount: 0,
      bonusPaid: false,
    });
    affiliateReferrals.set(referredByAffiliateUserId, list);
  }

  return profile;
}

export function enrollAffiliate(params: {
  userId: string;
  userEmail: string;
  displayName: string;
}): AffiliateProfile {
  const existing = affiliates.get(params.userId);
  if (existing) return existing;

  try {
    registerCreatorIdentity({
      userId: params.userId,
      displayName: params.displayName,
    });
  } catch (error) {
    mapContentProtectionError(error);
  }

  const link = getOrCreateUserLink({
    userId: params.userId,
    userEmail: params.userEmail,
    displayName: params.displayName,
    role: "affiliate",
  });
  setUserLinkRole(params.userId, "affiliate");

  const referralCode = link.slug.toUpperCase();
  const profile: AffiliateProfile = {
    userId: params.userId,
    userEmail: normalizeEmail(params.userEmail),
    displayName: params.displayName,
    referralCode,
    customSlug: link.slug,
    customUrl: link.customUrl,
    enrolledAt: new Date().toISOString(),
    totalReferrals: 0,
    qualifiedReferrals: 0,
    totalBonusesPaidCents: 0,
    pendingBonusCents: 0,
  };
  affiliates.set(params.userId, profile);
  referralCodeIndex.set(referralCode, params.userId);
  referralCodeIndex.set(link.slug.toUpperCase(), params.userId);
  affiliateReferrals.set(params.userId, []);
  return profile;
}

export function getContentCreatorProfile(userId: string): ContentCreatorProfile | null {
  return creators.get(userId) ?? null;
}

export function getAffiliateProfile(userId: string): AffiliateProfile | null {
  return affiliates.get(userId) ?? null;
}

export function buildReferralLink(referralCode: string): string {
  const link = resolveUserLink(referralCode);
  if (link) return link.customUrl;
  return buildSignupUrlFromSlug(referralCode);
}

export function buildReferralShareText(referralCode: string): string {
  return `Join UR Platform as a content creator and host paid live classes. Use my link: ${buildReferralLink(referralCode)}`;
}

export function recordCreatorTransaction(params: {
  creatorUserId: string;
  amountCents: number;
  payerUserId?: string;
  payerEmail?: string;
  sessionId?: string;
  creatorAiId?: string;
  paymentIntentId?: string;
  attributionSlug?: string;
}): {
  creator: ContentCreatorProfile;
  affiliateBonusTriggered: boolean;
  affiliateUserId?: string;
} {
  const creator = creators.get(params.creatorUserId);
  if (!creator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Content creator profile not found.",
    });
  }

  creator.transactionCount += 1;
  creator.totalEarningsCents += params.amountCents;
  creators.set(params.creatorUserId, creator);

  recordTransaction({
    type: "live_class_ticket",
    amountCents: params.amountCents,
    description: `Live class ticket — creator ${creator.displayName}`,
    payerUserId: params.payerUserId,
    payerEmail: params.payerEmail,
    payeeUserId: params.creatorUserId,
    payeeEmail: creator.userEmail,
    affiliateUserId: creator.referredByAffiliateUserId,
    affiliateSlug: creator.referredByAffiliateCode,
    sessionId: params.sessionId,
    creatorAiId: params.creatorAiId,
    paymentIntentId: params.paymentIntentId,
    attributionSlug: params.attributionSlug ?? creator.referredByAffiliateCode,
    metadata: { creatorTransactionNumber: creator.transactionCount },
  });

  const ledgerTx = listAllTransactions({ userId: params.creatorUserId, limit: 1 })[0];
  processInstantCreatorPayout({
    creatorUserId: params.creatorUserId,
    grossCents: params.amountCents,
    sourceTransactionId: ledgerTx?.id,
    description: `Instant payout for class sale #${creator.transactionCount}`,
  });

  let affiliateBonusTriggered = false;
  let affiliateUserId: string | undefined;

  if (
    creator.referredByAffiliateUserId &&
    !creator.affiliateBonusPaid &&
    creator.transactionCount >= AFFILIATE_PAYOUT_AFTER_TRANSACTIONS
  ) {
    affiliateUserId = creator.referredByAffiliateUserId;
    const affiliate = affiliates.get(affiliateUserId);
    if (affiliate) {
      affiliate.qualifiedReferrals += 1;
      affiliate.totalBonusesPaidCents += AFFILIATE_BONUS_CENTS;
      affiliates.set(affiliateUserId, affiliate);

      const list = affiliateReferrals.get(affiliateUserId) ?? [];
      const rec = list.find((r) => r.creatorUserId === params.creatorUserId);
      if (rec) {
        rec.transactionCount = creator.transactionCount;
        rec.bonusPaid = true;
        rec.bonusPaidAt = new Date().toISOString();
      }
      affiliateReferrals.set(affiliateUserId, list);
    }

    creator.affiliateBonusPaid = true;
    creators.set(params.creatorUserId, creator);
    affiliateBonusTriggered = true;

    const affiliateProfile = affiliates.get(affiliateUserId);
    recordTransaction({
      type: "affiliate_bonus",
      amountCents: AFFILIATE_BONUS_CENTS,
      description: `Affiliate bonus — ${creator.displayName} completed ${AFFILIATE_PAYOUT_AFTER_TRANSACTIONS} transactions`,
      payeeUserId: affiliateUserId,
      payeeEmail: affiliateProfile?.userEmail,
      affiliateUserId,
      affiliateSlug: affiliateProfile?.customSlug,
      metadata: { referredCreatorUserId: params.creatorUserId },
    });
  } else if (creator.referredByAffiliateUserId) {
    const list = affiliateReferrals.get(creator.referredByAffiliateUserId) ?? [];
    const rec = list.find((r) => r.creatorUserId === params.creatorUserId);
    if (rec) rec.transactionCount = creator.transactionCount;
    affiliateReferrals.set(creator.referredByAffiliateUserId, list);
  }

  return { creator, affiliateBonusTriggered, affiliateUserId };
}

export function getCreatorDashboard(userId: string) {
  const profile = getContentCreatorProfile(userId);
  if (!profile) {
    return { enrolled: false as const };
  }
  return {
    enrolled: true as const,
    profile,
    customUrl: profile.customUrl,
    customSlug: profile.customSlug,
    transactionsUntilAffiliateQualifies: profile.referredByAffiliateUserId
      ? Math.max(0, AFFILIATE_PAYOUT_AFTER_TRANSACTIONS - profile.transactionCount)
      : null,
    affiliatePayoutThreshold: AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
  };
}

export function getAffiliateDashboard(userId: string) {
  const profile = getAffiliateProfile(userId);
  if (!profile) {
    return { enrolled: false as const };
  }
  const referrals = affiliateReferrals.get(userId) ?? [];
  return {
    enrolled: true as const,
    profile,
    referralLink: profile.customUrl,
    signupLink: buildSignupUrlFromSlug(profile.customSlug),
    shareText: buildReferralShareText(profile.referralCode),
    bonusPerCreatorUsd: (AFFILIATE_BONUS_CENTS / 100).toFixed(2),
    payoutAfterTransactions: AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
    referrals: referrals.map((r) => ({
      ...r,
      transactionsRemaining: Math.max(0, AFFILIATE_PAYOUT_AFTER_TRANSACTIONS - r.transactionCount),
    })),
  };
}

export function attachReferralAtSignup(params: {
  userId: string;
  userEmail: string;
  displayName: string;
  role: "creator" | "affiliate";
  referralCode?: string;
}): ContentCreatorProfile | AffiliateProfile {
  if (params.role === "affiliate") {
    return enrollAffiliate({
      userId: params.userId,
      userEmail: params.userEmail,
      displayName: params.displayName,
    });
  }
  return enrollContentCreator({
    userId: params.userId,
    userEmail: params.userEmail,
    displayName: params.displayName,
    referralCode: params.referralCode,
  });
}
