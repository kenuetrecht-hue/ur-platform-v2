/**
 * Buyer pays Stripe. After Stripe's card fee, the leftover is:
 * creator share of the listed price + UR's share + remittable tax.
 * Tax and card fee are never taken from the creator.
 */

export type CreatorStripeKind = "sale" | "tip";

export type CreatorStripeSplit = {
  kind: CreatorStripeKind;
  subtotalCents: number;
  creatorShare: number;
  creatorCents: number;
  platformFeeCents: number;
  remittableTaxCents: number;
  /** Amount Stripe keeps on the platform account (UR share + tax). */
  applicationFeeCents: number;
  netToMerchantCents: number;
};

export function creatorShareForKind(kind: CreatorStripeKind, saleShare: number): number {
  if (kind === "tip") return 1;
  const share = Number.isFinite(saleShare) ? saleShare : 0.85;
  return Math.min(1, Math.max(0, share));
}

export function splitCreatorStripeCharge(params: {
  kind: CreatorStripeKind;
  subtotalCents: number;
  salesTaxCents: number;
  stateFeeCents: number;
  saleShare: number;
}): CreatorStripeSplit {
  const subtotalCents = Math.max(0, Math.round(params.subtotalCents));
  const remittableTaxCents = Math.max(0, Math.round(params.salesTaxCents) + Math.round(params.stateFeeCents));
  const creatorShare = creatorShareForKind(params.kind, params.saleShare);
  const creatorCents = Math.round(subtotalCents * creatorShare);
  const platformFeeCents = subtotalCents - creatorCents;
  const applicationFeeCents = platformFeeCents + remittableTaxCents;
  const netToMerchantCents = subtotalCents + remittableTaxCents;

  return {
    kind: params.kind,
    subtotalCents,
    creatorShare,
    creatorCents,
    platformFeeCents,
    remittableTaxCents,
    applicationFeeCents,
    netToMerchantCents,
  };
}
