import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  OWNER_PRICE_SKU_BY_ID,
  dollarsToCents,
  resolveOwnerPriceSkuId,
} from "../lib/owner-price-catalog";
import { PLATFORM_PASS_CENTS } from "../lib/ai-subscription-pricing";
import {
  _resetOwnerPriceCatalogForTests,
  getLivePriceCents,
  looksLikeOwnerPriceCommand,
  resetOwnerPriceSku,
  setOwnerPriceSku,
  tryApplyOwnerPriceCommand,
} from "../server/_core/owner-price-catalog-service";
import {
  _clearAiSubscriptionsForTests,
  purchaseAiSubscription,
} from "../server/_core/ai-subscription-service";

describe("owner price catalog", () => {
  beforeEach(() => {
    _resetOwnerPriceCatalogForTests();
    _clearAiSubscriptionsForTests();
  });

  it("maps aliases and keeps published defaults", () => {
    expect(resolveOwnerPriceSkuId("monthly text")).toBe("text.month");
    expect(resolveOwnerPriceSkuId("talk.talk_200")).toBe("talk.talk_200");
    expect(resolveOwnerPriceSkuId("3d extra slot")).toBe("workspace.extra_ai_slot");
    expect(OWNER_PRICE_SKU_BY_ID["text.month"]?.defaultCents).toBe(PLATFORM_PASS_CENTS.month);
    expect(dollarsToCents(29.99)).toBe(2999);
  });

  it("lets the owner override then reset a live checkout price", async () => {
    expect(await getLivePriceCents("text.month")).toBe(2499);
    const updated = await setOwnerPriceSku({ skuId: "text.month", priceCents: 2999 });
    expect(updated.liveCents).toBe(2999);
    expect(updated.isOverride).toBe(true);
    expect(await getLivePriceCents("text.month")).toBe(2999);

    const record = purchaseAiSubscription({
      userId: "user-live-price",
      userEmail: "fan@example.com",
      creatorId: "ai-wellness-001",
      plan: "month",
      billingStateCode: "FL",
      priceCents: updated.liveCents,
    });
    expect(record.priceCents).toBe(2999);

    const reset = await resetOwnerPriceSku("text.month");
    expect(reset.liveCents).toBe(2499);
    expect(reset.isOverride).toBe(false);
  });

  it("rejects prices outside the allowed range", async () => {
    await expect(setOwnerPriceSku({ skuId: "text.day", priceCents: 10 })).rejects.toBeInstanceOf(
      TRPCError,
    );
  });

  it("applies Steward SET PRICE and RESET PRICE commands", async () => {
    expect(looksLikeOwnerPriceCommand("SET PRICE monthly text 29.99")).toBe(true);
    const set = await tryApplyOwnerPriceCommand("SET PRICE monthly text 29.99");
    expect(set?.skuId).toBe("text.month");
    expect(set?.liveCents).toBe(2999);
    expect(set?.reset).toBe(false);

    const talk = await tryApplyOwnerPriceCommand("SET PRICE $5 talk 6.00");
    expect(talk?.skuId).toBe("talk.talk_5");
    expect(talk?.appStoreFiveDollarWarning).toBe(true);

    const reset = await tryApplyOwnerPriceCommand("RESET PRICE monthly text");
    expect(reset?.reset).toBe(true);
    expect(reset?.liveCents).toBe(2499);

    expect(await tryApplyOwnerPriceCommand("how are sales this week?")).toBeNull();
  });

  it("rejects unknown Steward product names", async () => {
    await expect(tryApplyOwnerPriceCommand("SET PRICE magic beans 9.99")).rejects.toBeInstanceOf(
      TRPCError,
    );
  });
});
