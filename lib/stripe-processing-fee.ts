/**
 * Stripe card fee — 2.9% + $0.30.
 * When we pass the fee to the payer, charge enough so the listed amount is what remains after Stripe.
 */

export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED_CENTS = 30;

/** Stripe’s cut if you charge `amountCents`. */
export function stripeFeeOnChargeCents(amountCents: number): number {
  return Math.round(amountCents * STRIPE_PERCENT) + STRIPE_FIXED_CENTS;
}

/**
 * Amount to charge the card so that after Stripe’s 2.9% + $0.30, `netCents` remains.
 * Use this when the recipient must receive 100% of the listed price.
 */
export function chargeToNetCents(netCents: number): number {
  if (netCents <= 0) return 0;
  return Math.ceil((netCents + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENT));
}

/** Extra the payer covers so the listed amount lands in full. */
export function payerCoversStripeFeeCents(netCents: number): number {
  return Math.max(0, chargeToNetCents(netCents) - netCents);
}
