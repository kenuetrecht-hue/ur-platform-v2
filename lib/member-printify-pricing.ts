/**
 * Member Printify orders. The buyer is a regular user, so UR keeps the markup.
 * This is not the creator 85/15 merch split.
 * Stripe’s 2.9% + $0.30 is added on the card, so it is not taken out of this price.
 * Retail is at least 50% over Printify’s cost and at least $4 over that cost.
 * Never exactly $5.00 (that amount is reserved for in-app checkout).
 */

export const MEMBER_PRINTIFY_MIN_PROFIT_CENTS = 400;

export function memberPrintifyRetailCents(costCents: number): number | null {
  if (!Number.isInteger(costCents) || costCents < 100) return null;
  const marked = Math.ceil(costCents * 1.5);
  let retail = Math.max(marked, costCents + MEMBER_PRINTIFY_MIN_PROFIT_CENTS);
  if (retail === 500) retail = 501;
  return retail;
}
