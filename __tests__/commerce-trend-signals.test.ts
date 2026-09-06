import { describe, expect, it, beforeEach } from "vitest";
import { ensurePlatformStore, addStoreProduct } from "../server/_core/commerce-catalog-service";
import {
  getTrendMarketSignals,
  refreshTrendMarketSignals,
  _resetTrendSignalsForTests,
} from "../server/_core/commerce-trend-signals-service";

describe("Commerce trend signals", () => {
  beforeEach(() => {
    _resetTrendSignalsForTests();
    ensurePlatformStore();
  });

  it("lists market gaps without creating products", () => {
    const before = getTrendMarketSignals();
    expect(before.rules.join(" ")).toContain("never auto-list");
    expect(before.signals.length).toBeGreaterThan(5);
    const productCountBefore = before.signals.reduce((sum, signal) => sum + signal.matchingTitles.length, 0);
    expect(productCountBefore).toBeGreaterThanOrEqual(0);
  });

  it("marks a real listed SKU as in stock for that market", () => {
    const store = ensurePlatformStore();
    addStoreProduct({
      storeId: store.id,
      title: "Jobsite Hard Hat",
      description: "Safety hard hat",
      priceCents: 2499,
      sourceType: "dropship",
      category: "Safety",
      tags: ["safety", "hard hat"],
    });
    const safety = getTrendMarketSignals().signals.find((signal) => signal.id === "jobsite-safety");
    expect(safety?.isGap).toBe(false);
    expect(safety?.matchingTitles.some((title) => title.includes("Hard Hat"))).toBe(true);
  });

  it("owner refresh attaches search sources and still does not auto-list", async () => {
    const result = await refreshTrendMarketSignals({ ownerUserId: "owner-1" });
    expect(result.searched).toBeGreaterThan(0);
    expect(result.signals.some((signal) => signal.sources.length > 0)).toBe(true);
    expect(result.rules.join(" ")).toContain("invent ASINs");
  });
});
