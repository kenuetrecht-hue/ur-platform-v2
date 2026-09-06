/**
 * Live market signals for the UR Platform Shop.
 * Owner refresh searches known categories. Nothing is auto-listed.
 */

import {
  matchTrendMarketToCatalog,
  rankMarketsToStock,
  TREND_MARKET_OWNER_RULES,
  TREND_MARKET_QUERIES,
  TREND_MARKET_REFRESH_HOURS,
  type TrendMarketQuery,
} from "../../lib/commerce-trend-markets";
import { webSearchSecurityEngine } from "../web-search-security";
import {
  ensurePlatformStore,
  listStoreProducts,
  type StoreProduct,
} from "./commerce-catalog-service";

export type TrendSignalSource = {
  title: string;
  url: string;
  snippet: string;
};

export type TrendMarketSignal = {
  id: string;
  label: string;
  kind: TrendMarketQuery["kind"];
  shopNeed: string;
  query: string;
  isGap: boolean;
  matchingTitles: string[];
  sources: TrendSignalSource[];
  fetchedAt: string | null;
};

type TrendCache = {
  fetchedAt: string | null;
  sourcesByMarket: Record<string, TrendSignalSource[]>;
};

let cache: TrendCache = { fetchedAt: null, sourcesByMarket: {} };

export function _resetTrendSignalsForTests(): void {
  cache = { fetchedAt: null, sourcesByMarket: {} };
}

function catalogHints(products: StoreProduct[]) {
  return products.map((product) => ({
    id: product.id,
    title: product.title,
    category: product.category,
    tags: product.tags,
    status: product.status,
  }));
}

function buildSignals(): TrendMarketSignal[] {
  const store = ensurePlatformStore();
  const products = listStoreProducts(store.id, true);
  const matches = TREND_MARKET_QUERIES.map((market) => ({
    market,
    match: matchTrendMarketToCatalog(market, catalogHints(products)),
  }));
  const ranked = rankMarketsToStock(matches.map((row) => row.match));
  const byId = new Map(matches.map((row) => [row.market.id, row]));
  return ranked.map((row) => {
    const pair = byId.get(row.marketId)!;
    const titles = pair.match.matchingProductIds
      .map((id) => products.find((product) => product.id === id)?.title)
      .filter((title): title is string => Boolean(title));
    return {
      id: pair.market.id,
      label: pair.market.label,
      kind: pair.market.kind,
      shopNeed: pair.market.shopNeed,
      query: pair.market.query,
      isGap: pair.match.isGap,
      matchingTitles: titles,
      sources: cache.sourcesByMarket[pair.market.id] ?? [],
      fetchedAt: cache.fetchedAt,
    };
  });
}

export function getTrendMarketSignals(): {
  rules: readonly string[];
  refreshedAt: string | null;
  staleAfterHours: number;
  gaps: number;
  signals: TrendMarketSignal[];
} {
  const signals = buildSignals();
  return {
    rules: TREND_MARKET_OWNER_RULES,
    refreshedAt: cache.fetchedAt,
    staleAfterHours: TREND_MARKET_REFRESH_HOURS,
    gaps: signals.filter((signal) => signal.isGap).length,
    signals,
  };
}

export function listPublicTrendingMarkets(limit = 8): Array<{
  id: string;
  label: string;
  shopNeed: string;
  inStock: boolean;
}> {
  return getTrendMarketSignals()
    .signals.slice(0, limit)
    .map((signal) => ({
      id: signal.id,
      label: signal.label,
      shopNeed: signal.shopNeed,
      inStock: !signal.isGap,
    }));
}

export async function refreshTrendMarketSignals(params: { ownerUserId: string }): Promise<{
  refreshedAt: string;
  searched: number;
  gaps: number;
  signals: TrendMarketSignal[];
  rules: readonly string[];
}> {
  const sourcesByMarket: Record<string, TrendSignalSource[]> = {};
  for (const market of TREND_MARKET_QUERIES) {
    const result = await webSearchSecurityEngine.performSearch(
      market.query,
      "store-manager",
      params.ownerUserId,
      market.kind,
    );
    if (!result.success) continue;
    sourcesByMarket[market.id] = result.results.slice(0, 3).map((item) => ({
      title: item.title.slice(0, 160),
      url: item.url,
      snippet: item.description.slice(0, 240),
    }));
  }
  cache = { fetchedAt: new Date().toISOString(), sourcesByMarket };
  const snapshot = getTrendMarketSignals();
  return {
    refreshedAt: cache.fetchedAt!,
    searched: Object.keys(sourcesByMarket).length,
    gaps: snapshot.gaps,
    signals: snapshot.signals,
    rules: TREND_MARKET_OWNER_RULES,
  };
}

export function formatTrendSignalsForStoreManager(): string {
  const snapshot = getTrendMarketSignals();
  const lines = snapshot.signals
    .slice(0, 12)
    .map((signal) => {
      const stock = signal.isGap ? "GAP — no SKU yet" : `in stock: ${signal.matchingTitles.join(", ")}`;
      const source = signal.sources[0] ? ` · source: ${signal.sources[0].title}` : "";
      return `- ${signal.label}: ${signal.shopNeed} (${stock})${source}`;
    })
    .join("\n");
  return `
## Live market signals (not auto-listed)
Refreshed: ${snapshot.refreshedAt ?? "not yet — owner can refresh in Administration"}
Gaps to stock: ${snapshot.gaps}
${lines}

Rules:
${TREND_MARKET_OWNER_RULES.map((rule) => `- ${rule}`).join("\n")}
`.trim();
}
