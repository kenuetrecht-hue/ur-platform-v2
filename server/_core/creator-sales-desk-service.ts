import {
  CREATOR_SALES_DESK_DAYS,
  countUniquePageVisitors,
  salesDeskAdvice,
  summarizeCreatorSales,
  type CreatorOfferTotal,
} from "../../lib/creator-sales-desk";
import { listCreatorRoster } from "./partner-program-service";
import { getFeed } from "./social-feed-service";
import { listAllTransactions } from "./transaction-ledger-service";
import { getUserLink } from "./user-link-service";
import { loadVisitorTrailEvents } from "./visitor-trail-service";

const ROSTER_DAYS = 7;

export type CreatorSalesDeskView = {
  days: number;
  linkOpens: number;
  salesCount: number;
  salesCents: number;
  conversionPercent: number | null;
  advice: string;
  offers: CreatorOfferTotal[];
  posts: Array<{ id: string; text: string; likes: number; comments: number }>;
  roster: Array<{ displayName: string; linkOpens: number; salesCount: number; salesCents: number }> | null;
};

export async function getCreatorSalesDesk(params: {
  userId: string;
  isPlatformOwner: boolean;
  now?: Date;
}): Promise<CreatorSalesDeskView> {
  const now = params.now ?? new Date();
  const sinceMs = now.getTime() - CREATOR_SALES_DESK_DAYS * 24 * 60 * 60 * 1000;
  const events = await loadVisitorTrailEvents(new Date(sinceMs));
  const link = getUserLink(params.userId);
  const path = link ? `/link/${link.slug}` : "";
  const linkOpens = path ? countUniquePageVisitors(events, path, sinceMs) : 0;
  const sales = summarizeCreatorSales(listAllTransactions({ userId: params.userId, limit: 300 }), params.userId, sinceMs);
  const feed = getFeed({ viewerUserId: params.userId, authorUserId: params.userId, sort: "top", limit: 5 });
  const posts = feed.posts.map((post) => ({
    id: post.id,
    text: post.body.trim().slice(0, 80) || "Picture or video post",
    likes: post.likeCount,
    comments: post.commentCount,
  }));
  const topOffer = sales.offers[0] ?? null;
  const topPostLikes = posts.reduce((max, post) => Math.max(max, post.likes), 0);
  const roster = params.isPlatformOwner
    ? listCreatorRoster()
        .filter((creator) => creator.userId !== params.userId)
        .slice(0, 20)
        .map((creator) => {
          const weekMs = now.getTime() - ROSTER_DAYS * 24 * 60 * 60 * 1000;
          const creatorSales = summarizeCreatorSales(
            listAllTransactions({ userId: creator.userId, limit: 100 }),
            creator.userId,
            weekMs,
          );
          return {
            displayName: creator.displayName,
            linkOpens: countUniquePageVisitors(events, `/link/${creator.customSlug}`, weekMs),
            salesCount: creatorSales.count,
            salesCents: creatorSales.cents,
          };
        })
    : null;

  return {
    days: CREATOR_SALES_DESK_DAYS,
    linkOpens,
    salesCount: sales.count,
    salesCents: sales.cents,
    conversionPercent: linkOpens > 0 ? Math.round((sales.count / linkOpens) * 100) : null,
    advice: salesDeskAdvice({
      linkOpens,
      salesCount: sales.count,
      topOfferLabel: topOffer?.label ?? null,
      topPostLikes,
    }),
    offers: sales.offers,
    posts,
    roster,
  };
}
