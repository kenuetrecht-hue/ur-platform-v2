import { describe, it, expect } from "vitest";
import {
  ensurePlatformStore,
  ensureCreatorStore,
  addStoreProduct,
  getStoreAnalytics,
  rotateCatalog,
  simulateProductPurchase,
  STORE_MANAGER_AI_ID,
  canUseStoreManagerAi,
} from "../server/_core/commerce-catalog-service";
import { isCreatorAiId } from "../server/_core/ai-creator-registry";

describe("Commerce storefront", () => {
  it("seeds platform shop with dropship and affiliate products", () => {
    const store = ensurePlatformStore();
    expect(store.slug).toBe("shop");
    const analytics = getStoreAnalytics(store.id);
    expect(analytics.activeProducts).toBeGreaterThan(0);
  });

  it("lets creators open a merch store and list products", () => {
    const creatorId = "commerce-creator-1";
    const store = ensureCreatorStore({
      userId: creatorId,
      displayName: "Taylor",
      email: "taylor@test.com",
    });
    expect(store.kind).toBe("creator");

    const product = addStoreProduct({
      storeId: store.id,
      title: "Custom Hoodie",
      description: "Designed in UR 3D workspace",
      priceCents: 3999,
      sourceType: "creator_merch",
    });
    expect(product.title).toBe("Custom Hoodie");

    const analytics = getStoreAnalytics(store.id);
    expect(analytics.activeProducts).toBe(1);
  });

  it("tracks simulated purchases with creator revenue split", () => {
    const store = ensureCreatorStore({
      userId: "buyer-creator",
      displayName: "Sam",
      email: "sam@test.com",
    });
    const product = addStoreProduct({
      storeId: store.id,
      title: "Sticker Pack",
      description: "Test",
      priceCents: 1000,
      sourceType: "creator_merch",
    });
    const order = simulateProductPurchase({
      productId: product.id,
      buyerUserId: "buyer-1",
      buyerEmail: "buyer@test.com",
    });
    expect(order.creatorShareCents).toBe(850);
    expect(order.platformShareCents).toBe(150);
  });

  it("lists owner originals on the platform shop with 100% UR share", () => {
    const store = ensurePlatformStore();
    const product = addStoreProduct({
      storeId: store.id,
      title: "Owner Song",
      description: "Original audio",
      priceCents: 999,
      sourceType: "owner_digital",
      digitalKind: "song",
    });
    const order = simulateProductPurchase({
      productId: product.id,
      buyerUserId: "buyer-owner-merch",
      buyerEmail: "buyer@test.com",
    });
    expect(order.creatorShareCents).toBe(0);
    expect(order.platformShareCents).toBe(999);
  });

  it("does not archive owner originals during catalog rotation", () => {
    const store = ensurePlatformStore();
    const product = addStoreProduct({
      storeId: store.id,
      title: "Owner Ebook",
      description: "Keep this listed",
      priceCents: 1299,
      sourceType: "owner_digital",
      digitalKind: "ebook",
    });
    product.views = 50;
    product.orders = 0;
    const result = rotateCatalog(store.id);
    expect(result.archived).not.toContain("Owner Ebook");
    expect(product.status).toBe("active");
  });

  it("registers Store Manager AI with full specialist capabilities", () => {
    expect(isCreatorAiId(STORE_MANAGER_AI_ID)).toBe(true);
    expect(canUseStoreManagerAi({ userId: "x", isPlatformOwner: true })).toBe(true);
  });
});
