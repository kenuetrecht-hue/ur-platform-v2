import { describe, it, expect, afterEach } from "vitest";
import {
  getCommerceProviderStatus,
  buildAffiliateOutboundUrl,
  submitFulfillmentOrder,
  isProviderConfigured,
} from "../server/_core/commerce-fulfillment-adapters";
import {
  initialProductStatus,
  approveAffiliateProduct,
  assertProductVisibleToPublic,
  setAffiliateApproval,
} from "../server/_core/commerce-affiliate-compliance";

describe("Commerce fulfillment adapters", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("lists all providers with configured flags", () => {
    const providers = getCommerceProviderStatus();
    expect(providers.some((p) => p.id === "printful")).toBe(true);
    expect(providers.some((p) => p.id === "amazon_associates")).toBe(true);
    expect(providers.some((p) => p.id === "walmart_affiliate")).toBe(true);
  });

  it("builds Amazon affiliate URL when tag is set", () => {
    process.env.AMAZON_ASSOCIATE_TAG = "ur-platform-20";
    const url = buildAffiliateOutboundUrl({
      provider: "amazon_associates",
      productUrl: "https://www.amazon.com/dp/B001",
    });
    expect(url).toContain("tag=ur-platform-20");
  });

  it("simulates Printful order when key missing", async () => {
    delete process.env.PRINTFUL_API_KEY;
    const result = await submitFulfillmentOrder({
      provider: "printful",
      quantity: 1,
      recipient: {
        name: "Test",
        address1: "1 Main",
        city: "Indy",
        state: "IN",
        zip: "46201",
        country: "US",
      },
    });
    expect(result.status).toBe("simulated");
  });

  it("detects configured provider from env", () => {
    process.env.WALMART_TRACKING_ID = "test-id";
    expect(isProviderConfigured("walmart_affiliate")).toBe(true);
  });
});

describe("Affiliate AI compliance", () => {
  it("pauses affiliate listings until approved", () => {
    expect(
      initialProductStatus({ sourceType: "affiliate", supplier: "amazon_associates" }),
    ).toBe("paused");
  });

  it("requires owner to approve affiliate products", () => {
    const result = approveAffiliateProduct({
      productId: "prod-1",
      approved: true,
      isPlatformOwner: true,
    });
    expect(result.approval).toBe("approved");
    expect(result.productStatus).toBe("active");
  });

  it("hides pending affiliate products from public view", () => {
    setAffiliateApproval({ productId: "p1", status: "pending" });
    const visible = assertProductVisibleToPublic({
      id: "p1",
      storeId: "s1",
      title: "T",
      description: "",
      priceCents: 100,
      sourceType: "affiliate",
      status: "active",
      category: "G",
      tags: [],
      views: 0,
      clicks: 0,
      orders: 0,
      revenueCents: 0,
      createdAt: "",
      updatedAt: "",
    });
    expect(visible).toBe(false);
  });
});
