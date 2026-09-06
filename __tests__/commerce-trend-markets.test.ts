import { describe, expect, it } from "vitest";
import {
  matchTrendMarketToCatalog,
  rankMarketsToStock,
  TREND_MARKET_OWNER_RULES,
  TREND_MARKET_QUERIES,
} from "../lib/commerce-trend-markets";

describe("Business store trend markets", () => {
  it("covers creator gear and trade materials the shop should stock", () => {
    const ids = TREND_MARKET_QUERIES.map((market) => market.id);
    expect(ids).toContain("lighting");
    expect(ids).toContain("jobsite-safety");
    expect(ids).toContain("electrical-materials");
    expect(ids).toContain("plumbing-materials");
  });

  it("flags catalog gaps instead of inventing products", () => {
    const lighting = TREND_MARKET_QUERIES.find((market) => market.id === "lighting")!;
    const match = matchTrendMarketToCatalog(lighting, [
      {
        id: "sku-1",
        title: "UR Classic Tee",
        category: "Apparel",
        tags: ["merch"],
        status: "active",
      },
    ]);
    expect(match.isGap).toBe(true);
    expect(match.matchingProductIds).toEqual([]);
  });

  it("matches real in-stock SKUs to a market", () => {
    const lighting = TREND_MARKET_QUERIES.find((market) => market.id === "lighting")!;
    const match = matchTrendMarketToCatalog(lighting, [
      {
        id: "sku-light",
        title: "Ring Light Pro",
        category: "Equipment",
        tags: ["lighting", "streaming"],
        status: "active",
      },
    ]);
    expect(match.isGap).toBe(false);
    expect(match.matchingProductIds).toEqual(["sku-light"]);
  });

  it("ranks empty markets first so the owner knows what to stock", () => {
    const ranked = rankMarketsToStock([
      { marketId: "desk", matchingProductIds: ["a", "b"], isGap: false },
      { marketId: "hvac-materials", matchingProductIds: [], isGap: true },
    ]);
    expect(ranked[0]?.marketId).toBe("hvac-materials");
    expect(TREND_MARKET_OWNER_RULES.join(" ")).toContain("never auto-list");
  });
});
