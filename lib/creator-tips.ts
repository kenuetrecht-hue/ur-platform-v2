/**
 * Tips to content creators — money, not stamps.
 * Creator keeps 100% of the listed tip. The fan pays the Stripe card fee on top.
 * Never $5.00 (that slot is mobile in-app). Classes/merch stay 85/15.
 */

import { calculateCustomerCheckout } from "./stripe-checkout-pricing";

export const CREATOR_TIP_PACKS = [
  { id: "tip_1", label: "$1", priceCents: 100 },
  { id: "tip_2", label: "$2", priceCents: 200 },
  { id: "tip_4", label: "$4", priceCents: 400 },
  { id: "tip_10", label: "$10", priceCents: 1000 },
  { id: "tip_20", label: "$20", priceCents: 2000 },
  { id: "tip_25", label: "$25", priceCents: 2500 },
] as const;

export type CreatorTipPackId = (typeof CREATOR_TIP_PACKS)[number]["id"];

export function getCreatorTipPack(id: string) {
  return CREATOR_TIP_PACKS.find((p) => p.id === id);
}

export function creatorTipCheckout(priceCents: number, billingStateCode?: string | null) {
  const checkout = calculateCustomerCheckout(priceCents, billingStateCode);
  return {
    creatorGetsCents: priceCents,
    feeCents: checkout.stripeFeeCents,
    taxCents: checkout.salesTaxCents,
    chargeCents: checkout.totalCents,
    chargeLabel: checkout.totalDisplay,
    feeLabel: checkout.stripeFeeDisplay,
    taxLabel: checkout.salesTaxDisplay,
    creatorLabel: checkout.subtotalDisplay,
  };
}

export const CREATOR_TIPS_PURPOSE =
  "Tip a content creator. They receive 100% of the tip you choose. You pay sales tax (if your state taxes " +
  "digital services) and the Stripe card fee (2.9% + $0.30) on top so UR and the creator do not absorb those. Tips are not stamps, not a charity " +
  "donation, not tax-deductible, and not an investment. Live classes and merch still split 85% creator / 15% UR.";

export const CREATOR_TIPS_STEWARD_NOTES = `
## Creator tips (mandatory — separate from stamps)
Content creators have a **Tip** button. Listed amounts: $1, $2, $4, $10, $20, $25. Never $5.00.
The creator receives **100% of the listed tip**. The fan pays sales tax (if their state taxes digital services) and Stripe’s card fee on top so UR and the creator do not absorb those.
Do not mix this with plaza look tips or social stamps. Stamps are emoji stickers and pay the creator nothing.
Class tickets and creator merch stay 85% creator / 15% UR.
`.trim();
