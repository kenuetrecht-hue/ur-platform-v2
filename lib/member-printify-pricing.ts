/**
 * Member Printify orders. The buyer is a regular user, so UR keeps a small share.
 * This is not the creator 85/15 merch split.
 * Stripe’s 2.9% + $0.30 is added on the card, so it is not taken out of this price.
 * UR adds 12% of Printify’s print cost plus shipping, at least $1.25, and never more than $6.
 * Never exactly $5.00 (that amount is reserved for in-app checkout).
 */

export const MEMBER_PRINTIFY_MARKUP_RATE = 0.12;
export const MEMBER_PRINTIFY_MIN_PROFIT_CENTS = 125;
export const MEMBER_PRINTIFY_MAX_PROFIT_CENTS = 600;

export function memberPrintifyRetailCents(costCents: number): number | null {
  if (!Number.isInteger(costCents) || costCents < 100) return null;
  const percent = Math.ceil(costCents * MEMBER_PRINTIFY_MARKUP_RATE);
  const profit = Math.min(
    MEMBER_PRINTIFY_MAX_PROFIT_CENTS,
    Math.max(MEMBER_PRINTIFY_MIN_PROFIT_CENTS, percent),
  );
  let retail = costCents + profit;
  if (retail === 500) retail = 501;
  return retail;
}
