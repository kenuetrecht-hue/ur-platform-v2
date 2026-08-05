/**
 * Affiliate Associate AI — scoped sales assistant for enrolled affiliates only.
 * Minimal capabilities: affiliate link promo, social post drafts, basic sales copy.
 * NOT listed in the public AIs tab.
 */

export const AFFILIATE_ASSOCIATE_ID = "affiliate-associate";

export function isAffiliateOnlyAi(creatorId: string): boolean {
  return creatorId === AFFILIATE_ASSOCIATE_ID;
}

export function canChatAffiliateAssociate(params: {
  isPlatformOwner: boolean;
  isEnrolledAffiliate: boolean;
}): boolean {
  return params.isPlatformOwner || params.isEnrolledAffiliate;
}

/** Capabilities the Associate AI deliberately does NOT have. */
export const AFFILIATE_ASSOCIATE_RESTRICTIONS = [
  "No hive / multi-AI consultation",
  "No learning mode or certification paths",
  "No 3D workspace or sandbox build tools",
  "No handoffs to trade specialists",
  "No voice/video unless affiliate purchases a voice pack (text-first)",
  "Sales focus limited to UR Platform affiliate referrals",
];
