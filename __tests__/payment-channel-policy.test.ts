import { describe, it, expect, vi } from "vitest";
import {
  getRequiredPaymentChannel,
  isPaymentChannelAllowed,
  IN_APP_ONLY_SUBTOTAL_CENTS,
} from "../lib/payment-channel-policy";
import { getPlanPriceCents } from "../lib/ai-subscription-pricing";
import { getAiTalkPack } from "../lib/ai-talk-pricing";

describe("payment-channel-policy", () => {
  it("routes exactly $5 through the mobile app", () => {
    expect(getRequiredPaymentChannel(500)).toBe("in_app");
    expect(IN_APP_ONLY_SUBTOTAL_CENTS).toBe(500);
  });

  it("routes AI subscriptions through web browser", () => {
    expect(getRequiredPaymentChannel(getPlanPriceCents("ai-wellness-001", "day"))).toBe(
      "web_browser",
    );
    expect(getRequiredPaymentChannel(getPlanPriceCents("linguamate", "month"))).toBe("web_browser");
  });

  it("routes $1 talk pack through web browser", () => {
    expect(getRequiredPaymentChannel(getAiTalkPack("talk_1").priceCents)).toBe("web_browser");
  });

  it("blocks wrong client platform at purchase time", () => {
    expect(isPaymentChannelAllowed({ subtotalCents: 500, clientPlatform: "native" })).toBe(true);
    expect(isPaymentChannelAllowed({ subtotalCents: 500, clientPlatform: "web" })).toBe(false);
    expect(isPaymentChannelAllowed({ subtotalCents: 599, clientPlatform: "web" })).toBe(true);
    expect(isPaymentChannelAllowed({ subtotalCents: 599, clientPlatform: "native" })).toBe(false);
  });
});

describe("payment-channel-guard", () => {
  it("blocks simulated purchases in production", async () => {
    vi.resetModules();
    vi.doMock("../server/_core/env", () => ({
      ENV: { isProduction: true },
    }));
    const { assertSimulatedPurchaseAllowed } = await import("../server/_core/payment-channel-guard");
    expect(() => assertSimulatedPurchaseAllowed()).toThrow(/simulated purchases are disabled/i);
  });
});
