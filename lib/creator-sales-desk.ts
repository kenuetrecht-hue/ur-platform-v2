/**
 * Free creator sales desk.
 * Uses link opens, class tickets, replays, and tips UR already recorded.
 * No extra vendor bill. Creators keep 85% of classes and calls and 100% of tips.
 * UR keeps 15% of classes and calls, so a sale the desk helps create pays both sides.
 */

export const CREATOR_SALES_DESK_DAYS = 30;

const SALE_LABEL: Record<string, string> = {
  live_class_ticket: "Live class",
  class_replay_ticket: "Class replay",
  tip: "Tip",
};

export type CreatorSaleInput = {
  type: string;
  status: string;
  amountCents: number;
  createdAt: string;
  payeeUserId?: string;
};

export type CreatorOfferTotal = {
  label: string;
  count: number;
  cents: number;
};

export function summarizeCreatorSales(
  rows: CreatorSaleInput[],
  userId: string,
  sinceMs: number,
): { count: number; cents: number; offers: CreatorOfferTotal[] } {
  const totals = new Map<string, CreatorOfferTotal>();
  let count = 0;
  let cents = 0;
  for (const row of rows) {
    if (row.payeeUserId !== userId || row.status !== "completed") continue;
    const label = SALE_LABEL[row.type];
    if (!label) continue;
    if (Date.parse(row.createdAt) < sinceMs) continue;
    count += 1;
    cents += row.amountCents;
    const current = totals.get(label) ?? { label, count: 0, cents: 0 };
    current.count += 1;
    current.cents += row.amountCents;
    totals.set(label, current);
  }
  const offers = [...totals.values()].sort((a, b) => b.cents - a.cents);
  return { count, cents, offers };
}

export function countUniquePageVisitors(
  events: Array<{ visitorId: string; kind: string; path: string; createdAt: string }>,
  path: string,
  sinceMs: number,
): number {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.kind !== "page" || event.path !== path) continue;
    if (Date.parse(event.createdAt) < sinceMs) continue;
    ids.add(event.visitorId);
  }
  return ids.size;
}

export function salesDeskAdvice(input: {
  linkOpens: number;
  salesCount: number;
  topOfferLabel: string | null;
  topPostLikes: number;
}): string {
  if (input.linkOpens === 0 && input.salesCount === 0) {
    return "Share your creator link. A sale cannot start until someone opens it.";
  }
  if (input.linkOpens === 0 && input.salesCount > 0) {
    return "You made sales without the creator link. Put that link on the next post so the next sale is easier to trace.";
  }
  if (input.salesCount === 0 && input.topPostLikes > 0) {
    return "A post is getting likes and the link is not getting a sale. Put the price and your creator link on the next post.";
  }
  if (input.salesCount === 0) {
    return "People opened your link and did not pay. Put the next class time and the price on the page they land on.";
  }
  if (input.topOfferLabel === "Tip") {
    return "Tips are your biggest sale. Offer a class or a call near that same amount. You keep 85% of those.";
  }
  if (input.topOfferLabel) {
    return `Most of the money came from ${input.topOfferLabel}. Make another one like it and put the link under the post.`;
  }
  return "Keep the offer that just sold, and share the creator link again.";
}
