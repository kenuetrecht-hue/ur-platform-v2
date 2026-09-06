/**
 * Business-store market signals — what people are buying, not invented SKUs.
 * Search known trade + creator categories. Owner pastes real Amazon/Walmart URLs.
 */

import { AFFILIATE_CATEGORY_STARTERS } from "./affiliate-link-policy";

export const TREND_MARKET_REFRESH_HOURS = 6;

export type TrendMarketKind = "creator_gear" | "trade_material" | "home_office" | "seasonal";

export type TrendMarketQuery = {
  id: string;
  label: string;
  kind: TrendMarketKind;
  query: string;
  shopNeed: string;
  catalogHints: string[];
};

export const TREND_MARKET_QUERIES: readonly TrendMarketQuery[] = [
  ...AFFILIATE_CATEGORY_STARTERS.map((starter) => ({
    id: starter.id,
    label: starter.label,
    kind: starter.id === "home" || starter.id === "office" ? ("home_office" as const) : ("creator_gear" as const),
    query: `${starter.hint} best selling 2026`,
    shopNeed: starter.hint,
    catalogHints: [starter.id, starter.label, starter.hint]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter((part) => part.length >= 3),
  })),
  {
    id: "jobsite-safety",
    label: "Jobsite safety",
    kind: "trade_material",
    query: "construction safety gear hard hats gloves hi vis best sellers",
    shopNeed: "Hard hats, gloves, hi-vis, glasses",
    catalogHints: ["safety", "hard hat", "glove", "hi-vis", "hi vis"],
  },
  {
    id: "trade-tools",
    label: "Trade hand tools",
    kind: "trade_material",
    query: "electrician plumber HVAC hand tools best sellers",
    shopNeed: "Meters, wrenches, bits, pouches",
    catalogHints: ["tool", "wrench", "meter", "plier", "bit"],
  },
  {
    id: "electrical-materials",
    label: "Electrical materials",
    kind: "trade_material",
    query: "electrical wire connectors conduit boxes trending supplies",
    shopNeed: "Wire, connectors, boxes, conduit",
    catalogHints: ["electrical", "wire", "conduit", "connector"],
  },
  {
    id: "plumbing-materials",
    label: "Plumbing materials",
    kind: "trade_material",
    query: "plumbing fittings PEX PVC trending supplies",
    shopNeed: "Fittings, PEX, PVC, tape",
    catalogHints: ["plumb", "pex", "pvc", "fitting", "pipe"],
  },
  {
    id: "hvac-materials",
    label: "HVAC materials",
    kind: "trade_material",
    query: "HVAC filters refrigerant tools trending supplies",
    shopNeed: "Filters, gauges, coils, tape",
    catalogHints: ["hvac", "filter", "refrigerant", "coil"],
  },
  {
    id: "welding-materials",
    label: "Welding & fab",
    kind: "trade_material",
    query: "welding helmets rods clamps trending supplies",
    shopNeed: "Helmets, rods, clamps, gloves",
    catalogHints: ["weld", "helmet", "rod", "clamp"],
  },
  {
    id: "school-office",
    label: "School & office restock",
    kind: "home_office",
    query: "back to school office supplies trending 2026",
    shopNeed: "Notebooks, pens, chairs, monitors",
    catalogHints: ["notebook", "pen", "chair", "monitor", "school", "office"],
  },
] as const;

export type CatalogHintProduct = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  status: string;
};

export type TrendCatalogMatch = {
  marketId: string;
  matchingProductIds: string[];
  isGap: boolean;
};

export function matchTrendMarketToCatalog(
  market: Pick<TrendMarketQuery, "id" | "catalogHints">,
  products: CatalogHintProduct[],
): TrendCatalogMatch {
  const hints = market.catalogHints.map((hint) => hint.toLowerCase());
  const matchingProductIds = products
    .filter((product) => {
      if (product.status !== "active") return false;
      const haystack = `${product.title} ${product.category} ${product.tags.join(" ")}`.toLowerCase();
      return hints.some((hint) => hint.length >= 3 && haystack.includes(hint));
    })
    .map((product) => product.id);
  return {
    marketId: market.id,
    matchingProductIds,
    isGap: matchingProductIds.length === 0,
  };
}

export function rankMarketsToStock(matches: TrendCatalogMatch[]): TrendCatalogMatch[] {
  return [...matches].sort((a, b) => {
    if (a.isGap !== b.isGap) return a.isGap ? -1 : 1;
    return a.matchingProductIds.length - b.matchingProductIds.length;
  });
}

export const TREND_MARKET_OWNER_RULES = [
  "We search known creator and trade categories. We do not scrape the whole internet or invent ASINs.",
  "Signals suggest what to stock. They never auto-list a product.",
  "Affiliate picks stay paused until you approve a real amazon.com or walmart.com URL.",
  "FTC: disclose that UR Platform LLC may earn a commission on partner picks.",
] as const;
