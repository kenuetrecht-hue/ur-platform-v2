/**
 * Customer checkout pricing — service subtotal + state tax/fees + Stripe processing (paid by customer).
 *
 * Stripe charges 2.9% + $0.30 on the TOTAL amount charged.
 * We gross up so UR receives the full service subtotal + remittable tax after Stripe takes their cut.
 */

import { formatUsd } from "./ai-subscription-pricing";
import { calculateStateTaxAndFees, type StateTaxBreakdown } from "./us-state-taxes";

export const STRIPE_PERCENT_BPS = 290;
export const STRIPE_FIXED_CENTS = 30;

export type CustomerCheckoutPricing = {
  /** Service price before tax and processing */
  subtotalCents: number;
  /** State sales tax on subtotal */
  salesTaxCents: number;
  salesTaxLabel: string;
  salesTaxRateDisplay: string;
  /** Optional flat state/regulatory fee */
  stateFeeCents: number;
  stateFeeLabel?: string;
  /** Stripe fee passed through to customer */
  stripeFeeCents: number;
  /** Amount charged to customer's card */
  totalCents: number;
  subtotalDisplay: string;
  salesTaxDisplay: string;
  stateFeeDisplay: string;
  stripeFeeDisplay: string;
  totalDisplay: string;
  stripeFeeExplanation: string;
  stateCode: string | null;
  stateName: string | null;
  stateTaxNotes?: string;
};

/** Fee Stripe would take if we charged `amountCents` in one transaction */
export function estimateStripeFeeOnChargeCents(amountCents: number): number {
  return Math.round((amountCents * STRIPE_PERCENT_BPS) / 10000 + STRIPE_FIXED_CENTS);
}

function grossUpForStripe(netToMerchantCents: number): number {
  return Math.ceil((netToMerchantCents + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENT_BPS / 10000));
}

/**
 * Customer pays Stripe fees on top — UR nets subtotal + tax/fees owed to state.
 */
export function calculateCustomerCheckout(
  subtotalCents: number,
  stateCode?: string | null,
): CustomerCheckoutPricing {
  const stateTax = calculateStateTaxAndFees(subtotalCents, stateCode);
  return buildCheckoutPricing(subtotalCents, stateTax);
}

function buildCheckoutPricing(
  subtotalCents: number,
  stateTax: StateTaxBreakdown | null,
): CustomerCheckoutPricing {
  const salesTaxCents = stateTax?.salesTaxCents ?? 0;
  const stateFeeCents = stateTax?.stateFeeCents ?? 0;
  const netToMerchantCents = subtotalCents + salesTaxCents + stateFeeCents;
  const totalCents = grossUpForStripe(netToMerchantCents);
  const stripeFeeCents = totalCents - netToMerchantCents;

  return {
    subtotalCents,
    salesTaxCents,
    salesTaxLabel: stateTax?.salesTaxLabel ?? "Sales tax",
    salesTaxRateDisplay: stateTax?.salesTaxRateDisplay ?? "—",
    stateFeeCents,
    stateFeeLabel: stateTax?.stateFeeLabel,
    stripeFeeCents,
    totalCents,
    subtotalDisplay: formatUsd(subtotalCents),
    salesTaxDisplay: formatUsd(salesTaxCents),
    stateFeeDisplay: formatUsd(stateFeeCents),
    stripeFeeDisplay: formatUsd(stripeFeeCents),
    totalDisplay: formatUsd(totalCents),
    stripeFeeExplanation: "Stripe payment processing (2.9% + $0.30) — paid by you, not UR Platform LLC",
    stateCode: stateTax?.stateCode ?? null,
    stateName: stateTax?.stateName ?? null,
    stateTaxNotes: stateTax?.notes,
  };
}
