/**
 * Content creator & affiliate partner program.
 * $5 referral fee: after the creator's free 24 hours (launch joiners), then 5 later sales.
 */

import { TRPCError } from "@trpc/server";
import {
  getOrCreateUserLink,
  setUserLinkRole,
  resolveUserLink,
  buildSignupUrlFromSlug,
} from "./user-link-service";
import { recordTransaction, listAllTransactions } from "./transaction-ledger-service";
import { processInstantCreatorPayout } from "./creator-payout-service";
import {
  mapContentProtectionError,
  registerCreatorIdentity,
} from "./creator-content-protection-service";
import {
  AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS,
  AFFILIATE_REFERRAL_BONUS_CENTS,
  AFFILIATE_REFERRAL_PAYOUT_RULE,
  AFFILIATE_REFERRAL_PAYOUT_RULE_SHORT,
  canPayAffiliateReferralBonus,
  describeAffiliateReferralProgress,
  remainingQualifyingTransactions,
  resolveCreatorFreeServiceEnd,
  shouldCountTowardAffiliatePayout,
} from "../../lib/affiliate-referral-payout-policy";

export const AFFILIATE_BONUS_CENTS = AFFILIATE_REFERRAL_BONUS_CENTS;
export const AFFILIATE_PAYOUT_AFTER_TRANSACTIONS = AFFILIATE_PAYOUT_AFTER_QUALIFYING_TRANSACTIONS;

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
  /** Sales after the free 24 hours — only these count toward the $5 referral fee. */
  qualifyingTransactionCount: number;
  /** ISO end of launch free service, or null if they joined after the 30-day window. */
  freeServiceEndsAt: string | null;
  affiliateBonusPaid: boolean;
  totalEarningsCents: number;
  totalTipCents: number;
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
  qualifyingTransactionCount: number;
  freeServiceEndsAt: string | null;
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
  enrolledAt?: Date;
  launchDate?: Date;
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

  const enrolledAt = params.enrolledAt ?? new Date();
  const freeServiceEndsAt = resolveCreatorFreeServiceEnd({
    enrolledAt,
    launchDate: params.launchDate,
  });

  const profile: ContentCreatorProfile = {
    userId: params.userId,
    userEmail: normalizeEmail(params.userEmail),
    displayName: params.displayName,
    customSlug: link.slug,
    customUrl: link.customUrl,
    enrolledAt: enrolledAt.toISOString(),
    referredByAffiliateUserId,
    referredByAffiliateCode,
    transactionCount: 0,
    qualifyingTransactionCount: 0,
    freeServiceEndsAt: freeServiceEndsAt?.toISOString() ?? null,
    affiliateBonusPaid: false,
    totalEarningsCents: 0,
    totalTipCents: 0,
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
      qualifyingTransactionCount: 0,
      freeServiceEndsAt: profile.freeServiceEndsAt,
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

export function creditCreatorTipEarnings(userId: string, amountCents: number): ContentCreatorProfile {
  const creator = creators.get(userId);
  if (!creator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That member is not a content creator, so they cannot receive tips. Pass stamps like emojis instead, or tip an enrolled creator.",
    });
  }
  creator.totalEarningsCents += amountCents;
  creator.totalTipCents += amountCents;
  creators.set(userId, creator);
  return creator;
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
  return `Join UR Platform as a content creator. First 30 days: 24 hours free. I earn $5 only after your free day ends and you complete five later sales. ${AFFILIATE_REFERRAL_PAYOUT_RULE_SHORT} Use my link: ${buildReferralLink(referralCode)}`;
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
  occurredAt?: Date;
}): {
  creator: ContentCreatorProfile;
  affiliateBonusTriggered: boolean;
  affiliateUserId?: string;
  countedTowardAffiliatePayout: boolean;
} {
  const creator = creators.get(params.creatorUserId);
  if (!creator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Content creator profile not found.",
    });
  }

  const occurredAt = params.occurredAt ?? new Date();
  const freeServiceEndsAt = creator.freeServiceEndsAt ? new Date(creator.freeServiceEndsAt) : null;
  const countedTowardAffiliatePayout = shouldCountTowardAffiliatePayout({
    freeServiceEndsAt,
    transactionAt: occurredAt,
  });

  creator.transactionCount += 1;
  creator.qualifyingTransactionCount = creator.qualifyingTransactionCount ?? 0;
  if (countedTowardAffiliatePayout) {
    creator.qualifyingTransactionCount += 1;
  }
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
    metadata: {
      creatorTransactionNumber: creator.transactionCount,
      qualifyingTransactionNumber: creator.qualifyingTransactionCount,
      countedTowardAffiliatePayout,
    },
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
    canPayAffiliateReferralBonus({
      alreadyPaid: creator.affiliateBonusPaid,
      freeServiceEndsAt,
      qualifyingTransactionCount: creator.qualifyingTransactionCount,
      now: occurredAt,
    })
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
        rec.qualifyingTransactionCount = creator.qualifyingTransactionCount;
        rec.bonusPaid = true;
        rec.bonusPaidAt = occurredAt.toISOString();
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
      description: `Affiliate bonus — ${creator.displayName} finished the free 24 hours and completed ${AFFILIATE_PAYOUT_AFTER_TRANSACTIONS} later transactions`,
      payeeUserId: affiliateUserId,
      payeeEmail: affiliateProfile?.userEmail,
      affiliateUserId,
      affiliateSlug: affiliateProfile?.customSlug,
      metadata: { referredCreatorUserId: params.creatorUserId },
    });
  } else if (creator.referredByAffiliateUserId) {
    const list = affiliateReferrals.get(creator.referredByAffiliateUserId) ?? [];
    const rec = list.find((r) => r.creatorUserId === params.creatorUserId);
    if (rec) {
      rec.transactionCount = creator.transactionCount;
      rec.qualifyingTransactionCount = creator.qualifyingTransactionCount;
    }
    affiliateReferrals.set(creator.referredByAffiliateUserId, list);
  }

  return { creator, affiliateBonusTriggered, affiliateUserId, countedTowardAffiliatePayout };
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
      ? remainingQualifyingTransactions(profile.qualifyingTransactionCount)
      : null,
    affiliatePayoutThreshold: AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
    payoutRule: AFFILIATE_REFERRAL_PAYOUT_RULE,
    payoutStatus: profile.referredByAffiliateUserId
      ? describeAffiliateReferralProgress({
          freeServiceEndsAt: profile.freeServiceEndsAt ? new Date(profile.freeServiceEndsAt) : null,
          now: new Date(),
          qualifyingTransactionCount: profile.qualifyingTransactionCount,
          bonusPaid: profile.affiliateBonusPaid,
        })
      : null,
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
    payoutRule: AFFILIATE_REFERRAL_PAYOUT_RULE,
    payoutRuleShort: AFFILIATE_REFERRAL_PAYOUT_RULE_SHORT,
    referrals: referrals.map((r) => ({
      ...r,
      transactionsRemaining: remainingQualifyingTransactions(r.qualifyingTransactionCount),
      payoutStatus: describeAffiliateReferralProgress({
        freeServiceEndsAt: r.freeServiceEndsAt ? new Date(r.freeServiceEndsAt) : null,
        now: new Date(),
        qualifyingTransactionCount: r.qualifyingTransactionCount,
        bonusPaid: r.bonusPaid,
      }),
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
