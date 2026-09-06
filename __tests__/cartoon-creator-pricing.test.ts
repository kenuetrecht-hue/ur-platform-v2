import { describe, expect, it, beforeEach } from "vitest";
import {
  CARTOON_CREATOR_NO_REFUND_POLICY,
  CARTOON_CREATOR_PAY_FIRST_RULE,
  CARTOON_CREATOR_PLANS,
  FAN_PRICE_CENTS,
  quoteCartoonCreatorPlan,
} from "../lib/cartoon-creator-pricing";
import { buildCartoonCreatorPurchaseSummary } from "../lib/pricing-disclosures";
import { getRequiredPaymentChannel, IN_APP_ONLY_SUBTOTAL_CENTS } from "../lib/payment-channel-policy";
import {
  assertCanHostCartoon,
  getCartoonCreatorStatus,
  purchaseCartoonCreatorPlan,
  _resetCartoonCreatorEntitlementsForTests,
} from "../server/_core/cartoon-creator-entitlement-service";
import { createCartoonVideo, publishCartoonToCreatorPage, _resetCartoonStudioForTests } from "../server/_core/cartoon-studio-service";
import { saveCartoonSelf, _resetCartoonSelfForTests } from "../server/_core/cartoon-self-service";
import { quoteCartoonStudio } from "../lib/cartoon-studio-pricing";

describe("Cartoon Me Creator Platform pricing", () => {
  beforeEach(() => {
    _resetCartoonCreatorEntitlementsForTests();
    _resetCartoonStudioForTests();
    _resetCartoonSelfForTests();
  });

  it("never uses the $5.00 in-app price and stays above the profit floor", () => {
    for (const plan of CARTOON_CREATOR_PLANS) {
      const quote = quoteCartoonCreatorPlan(plan.id);
      expect(quote.subtotalCents).not.toBe(IN_APP_ONLY_SUBTOTAL_CENTS);
      expect(getRequiredPaymentChannel(quote.subtotalCents)).toBe("web_browser");
      expect(quote.subtotalCents).toBeGreaterThan(quote.costFloorCents);
      expect(quote.platformNetCents).toBeGreaterThanOrEqual(800);
    }
  });

  it("prices Channel cheaper than Studio cheaper than Network", () => {
    const channel = quoteCartoonCreatorPlan("channel");
    const studio = quoteCartoonCreatorPlan("studio");
    const network = quoteCartoonCreatorPlan("network");
    expect(channel.subtotalCents).toBe(4999);
    expect(studio.subtotalCents).toBe(14999);
    expect(network.subtotalCents).toBe(39999);
    expect(channel.subtotalCents).toBeLessThan(studio.subtotalCents);
    expect(studio.subtotalCents).toBeLessThan(network.subtotalCents);
    expect(channel.fansToCover * FAN_PRICE_CENTS).toBeGreaterThanOrEqual(channel.subtotalCents);
    expect(network.fansToCover).toBeLessThan(200);
  });

  it("puts tax, Stripe, $3.99-fan math, and no-refund copy on the receipt", () => {
    const summary = buildCartoonCreatorPurchaseSummary({ planId: "network", stateCode: "FL" });
    expect(summary.productType).toBe("cartoon_creator");
    expect(summary.youReceive.some((line) => line.label === "Covered by $3.99 fans")).toBe(true);
    expect(summary.priceBreakdown.some((line) => line.label === "Stripe processing fee")).toBe(true);
    expect(summary.importantNotes.join(" ")).toMatch(/no return policy/i);
    expect(summary.importantNotes.join(" ")).toMatch(/200,000|798,000|3\.99/i);
    expect(CARTOON_CREATOR_NO_REFUND_POLICY.toLowerCase()).toContain("no return policy");
    expect(CARTOON_CREATOR_PAY_FIRST_RULE.toLowerCase()).toContain("pay before");
  });

  it("blocks hosting until a creator pays, then unlocks after Channel", async () => {
    expect(() => assertCanHostCartoon({ userId: "creator-pay-1" })).toThrow(/pay first/i);
    purchaseCartoonCreatorPlan({
      userId: "creator-pay-1",
      userEmail: "creator-pay@test.com",
      displayName: "Channel Creator One",
      planId: "channel",
    });
    const status = getCartoonCreatorStatus("creator-pay-1");
    expect(status.canHost).toBe(true);
    expect(status.canGoLive).toBe(true);
    expect(status.liveMinutesRemaining).toBe(720);
    expect(() => assertCanHostCartoon({ userId: "creator-pay-1" })).not.toThrow();
  });

  it("lets a paying creator host a Cartoon Me video and lets the owner skip the card", async () => {
    saveCartoonSelf({
      userId: "creator-host-1",
      isPlatformOwner: false,
      displayName: "Studio Host One",
      lookNotes: "Short hair, navy shirt, yard lessons.",
      setting: "yard",
      hair: "short",
      shirt: "navy",
      attestedOwnLikeness: true,
    });
    const project = await createCartoonVideo({
      userId: "creator-host-1",
      isPlatformOwner: false,
      idea: "A yard lesson about a breaker panel.",
      style: "educational",
      quote: quoteCartoonStudio("draft", 8),
      useCartoonSelf: true,
    });
    expect(() =>
      publishCartoonToCreatorPage({
        userId: "creator-host-1",
        userEmail: "creator-host@test.com",
        displayName: "Studio Host One",
        projectId: project.id,
      }),
    ).toThrow(/Creator plan/i);

    purchaseCartoonCreatorPlan({
      userId: "creator-host-1",
      userEmail: "creator-host@test.com",
      displayName: "Studio Host One",
      planId: "studio",
    });
    const hosted = publishCartoonToCreatorPage({
      userId: "creator-host-1",
      userEmail: "creator-host@test.com",
      displayName: "Studio Host One",
      projectId: project.id,
    });
    expect(hosted.publishedAt).toBeTruthy();

    const ownerStatus = getCartoonCreatorStatus("owner-1", true);
    expect(ownerStatus.complimentary).toBe(true);
    expect(ownerStatus.canHost).toBe(true);
  });
});
