/**
 * Platform dropship + creator merchandise catalog.
 * In-memory MVP — persist to DB before production.
 * Live checkout waits on LLC/Stripe; simulated orders work for dev.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { getContentCreatorProfile } from "./partner-program-service";
import { getOrCreateUserLink } from "./user-link-service";
import {
  affiliateSupplierRequiresApproval,
  getAffiliateApproval,
  initialProductStatus,
  setAffiliateApproval,
  assertProductVisibleToPublic,
} from "./commerce-affiliate-compliance";
import { submitFulfillmentOrder, type FulfillmentProvider } from "./commerce-fulfillment-adapters";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";

export const STORE_MANAGER_AI_ID = "store-manager";

export type StoreKind = "platform" | "creator";
export type ProductSource = "dropship" | "affiliate" | "creator_merch" | "owner_digital";
export type ProductStatus = "active" | "paused" | "archived";

export type CommerceStore = {
  id: string;
  kind: StoreKind;
  ownerUserId: string;
  name: string;
  slug: string;
  tagline?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreProduct = {
  id: string;
  storeId: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
  sourceType: ProductSource;
  affiliateUrl?: string;
  supplier?: string;
  /** Owner original goods — ebooks, songs, merch, other. */
  digitalKind?: "ebook" | "song" | "merch" | "other";
  status: ProductStatus;
  category: string;
  tags: string[];
  views: number;
  clicks: number;
  orders: number;
  revenueCents: number;
  createdAt: string;
  updatedAt: string;
};

export type StoreOrder = {
  id: string;
  storeId: string;
  productId: string;
  buyerUserId: string;
  amountCents: number;
  creatorShareCents: number;
  platformShareCents: number;
  status: "simulated" | "paid" | "fulfilled" | "refunded";
  createdAt: string;
};

const stores = new Map<string, CommerceStore>();
const products = new Map<string, StoreProduct>();
const orders: StoreOrder[] = [];

const PLATFORM_STORE_ID = "platform-store-ur";
const CREATOR_SHARE_BPS = 8500; // 85%

function seedPlatformCatalog(storeId: string): void {
  if ([...products.values()].some((p) => p.storeId === storeId)) return;

  const seeds: Omit<
    StoreProduct,
    "id" | "storeId" | "views" | "clicks" | "orders" | "revenueCents" | "createdAt" | "updatedAt"
  >[] = [
    {
      title: "UR Platform Classic Tee",
      description: "Soft cotton tee with UR Platform logo — ships from our print partner.",
      priceCents: 2499,
      imageUrl: "https://placehold.co/400x400/1a1a2e/eee?text=UR+Tee",
      sourceType: "dropship",
      supplier: "printful",
      status: "active",
      category: "Apparel",
      tags: ["merch", "tee", "ur-platform"],
    },
    {
      title: "Creator Desk Mat",
      description: "Large desk pad for streaming and content creation setups.",
      priceCents: 3499,
      imageUrl: "https://placehold.co/400x400/16213e/eee?text=Desk+Mat",
      sourceType: "dropship",
      supplier: "printful",
      status: "active",
      category: "Accessories",
      tags: ["desk", "creator", "setup"],
    },
    {
      title: "Ring Light Pro (Affiliate)",
      description: "Popular ring light for creators — UR Platform may earn a commission.",
      priceCents: 5999,
      imageUrl: "https://placehold.co/400x400/0f3460/eee?text=Ring+Light",
      sourceType: "affiliate",
      affiliateUrl: "https://www.amazon.com/s?k=ring+light+streaming",
      supplier: "amazon_associates",
      status: "active",
      category: "Equipment",
      tags: ["lighting", "affiliate", "streaming"],
    },
    {
      title: "Wireless Mic Kit (Affiliate)",
      description: "Clip-on wireless mic trending for short-form video.",
      priceCents: 4499,
      imageUrl: "https://placehold.co/400x400/533483/eee?text=Mic+Kit",
      sourceType: "affiliate",
      affiliateUrl: "https://www.amazon.com/s?k=wireless+lavalier+microphone",
      supplier: "amazon_associates",
      status: "active",
      category: "Equipment",
      tags: ["audio", "affiliate", "tiktok"],
    },
    {
      title: "Hydro Bottle — Trending",
      description: "Insulated bottle category trending this season.",
      priceCents: 2999,
      imageUrl: "https://placehold.co/400x400/1b4332/eee?text=Bottle",
      sourceType: "dropship",
      supplier: "cj_dropshipping",
      status: "paused",
      category: "Lifestyle",
      tags: ["trending", "hydration"],
    },
  ];

  const now = new Date().toISOString();
  for (const seed of seeds) {
    const id = randomUUID();
    products.set(id, {
      ...seed,
      id,
      storeId,
      views: Math.floor(Math.random() * 40),
      clicks: Math.floor(Math.random() * 12),
      orders: Math.floor(Math.random() * 5),
      revenueCents: 0,
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const p of products.values()) {
    if (p.storeId === storeId) {
      p.revenueCents = p.orders * p.priceCents;
      if (affiliateSupplierRequiresApproval(p.supplier) || p.sourceType === "affiliate") {
        setAffiliateApproval({ productId: p.id, status: "approved" });
      }
    }
  }
}

export function ensurePlatformStore(): CommerceStore {
  let store = stores.get(PLATFORM_STORE_ID);
  if (!store) {
    const now = new Date().toISOString();
    store = {
      id: PLATFORM_STORE_ID,
      kind: "platform",
      ownerUserId: "platform",
      name: "UR Platform Shop",
      slug: "shop",
      tagline: "UR originals (ebooks, songs, merch) and Amazon/Walmart picks. Creators sell merch in their own shops.",
      createdAt: now,
      updatedAt: now,
    };
    stores.set(store.id, store);
  }
  seedPlatformCatalog(store.id);
  return store;
}

export function ensureCreatorStore(params: {
  userId: string;
  displayName: string;
  email: string;
}): CommerceStore {
  const existing = [...stores.values()].find(
    (s) => s.kind === "creator" && s.ownerUserId === params.userId,
  );
  if (existing) return existing;

  const link = getOrCreateUserLink({
    userId: params.userId,
    userEmail: params.email,
    displayName: params.displayName,
    role: "creator",
  });

  const now = new Date().toISOString();
  const store: CommerceStore = {
    id: randomUUID(),
    kind: "creator",
    ownerUserId: params.userId,
    name: `${params.displayName.split(" ")[0] ?? "Creator"}'s Merch`,
    slug: link.slug,
    tagline: "Official creator merchandise on UR Platform",
    createdAt: now,
    updatedAt: now,
  };
  stores.set(store.id, store);
  return store;
}

export function getStoreBySlug(slug: string): CommerceStore | null {
  ensurePlatformStore();
  return [...stores.values()].find((s) => s.slug === slug) ?? null;
}

export function getStoreForOwner(userId: string, kind: StoreKind): CommerceStore | null {
  ensurePlatformStore();
  if (kind === "platform") {
    return stores.get(PLATFORM_STORE_ID) ?? null;
  }
  return [...stores.values()].find((s) => s.kind === "creator" && s.ownerUserId === userId) ?? null;
}

export function listStoreProducts(storeId: string, includeArchived = false): StoreProduct[] {
  return [...products.values()]
    .filter((p) => p.storeId === storeId && (includeArchived || p.status !== "archived"))
    .sort((a, b) => b.orders - a.orders || b.views - a.views);
}

/** Public storefront — hides unapproved affiliate / AI-assisted listings. */
export function listPublicStoreProducts(storeId: string): StoreProduct[] {
  return listStoreProducts(storeId).filter((p) => assertProductVisibleToPublic(p));
}

export function addStoreProduct(params: {
  storeId: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
  sourceType: ProductSource;
  affiliateUrl?: string;
  supplier?: string;
  category?: string;
  tags?: string[];
  aiAssisted?: boolean;
  digitalKind?: "ebook" | "song" | "merch" | "other";
}): StoreProduct {
  const store = stores.get(params.storeId);
  if (!store) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
  }
  const now = new Date().toISOString();
  const status = initialProductStatus({
    sourceType: params.sourceType,
    supplier: params.supplier,
    aiAssisted: params.aiAssisted,
  });
  const product: StoreProduct = {
    id: randomUUID(),
    storeId: params.storeId,
    title: params.title.trim().slice(0, 120),
    description: params.description.trim().slice(0, 2000),
    priceCents: Math.max(99, params.priceCents),
    imageUrl: params.imageUrl?.slice(0, 2000),
    sourceType: params.sourceType,
    affiliateUrl: params.affiliateUrl?.slice(0, 2000),
    supplier: params.supplier?.slice(0, 64),
    digitalKind: params.sourceType === "owner_digital" ? params.digitalKind : undefined,
    status,
    category: params.category?.slice(0, 64) ?? "General",
    tags: (params.tags ?? []).slice(0, 10),
    views: 0,
    clicks: 0,
    orders: 0,
    revenueCents: 0,
    createdAt: now,
    updatedAt: now,
  };
  products.set(product.id, product);
  if (status === "paused" && (params.sourceType === "affiliate" || affiliateSupplierRequiresApproval(params.supplier))) {
    setAffiliateApproval({ productId: product.id, status: "pending" });
  }
  return product;
}

export function getProductWithApproval(productId: string): (StoreProduct & { approval: ReturnType<typeof getAffiliateApproval> }) | null {
  const product = products.get(productId);
  if (!product) return null;
  return { ...product, approval: getAffiliateApproval(productId) };
}

export function updateProductStatus(params: {
  productId: string;
  storeId: string;
  status: ProductStatus;
}): StoreProduct {
  const product = products.get(params.productId);
  if (!product || product.storeId !== params.storeId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
  }
  product.status = params.status;
  product.updatedAt = new Date().toISOString();
  products.set(product.id, product);
  return product;
}

export function recordProductView(productId: string): void {
  const p = products.get(productId);
  if (!p) return;
  p.views += 1;
  products.set(productId, p);
}

export function recordProductClick(productId: string): void {
  const p = products.get(productId);
  if (!p) return;
  p.clicks += 1;
  products.set(productId, p);
}

export function simulateProductPurchase(params: {
  productId: string;
  buyerUserId: string;
  buyerEmail: string;
  billingStateCode?: string | null;
}): StoreOrder & { checkout: ReturnType<typeof calculateCustomerCheckout> } {
  const product = products.get(params.productId);
  if (!product || !assertProductVisibleToPublic(product)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Product not available." });
  }
  const store = stores.get(product.storeId);
  if (!store) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
  }

  product.orders += 1;
  product.revenueCents += product.priceCents;
  product.updatedAt = new Date().toISOString();
  products.set(product.id, product);

  const creatorShareCents =
    store.kind === "creator" && product.sourceType === "creator_merch"
      ? Math.floor((product.priceCents * CREATOR_SHARE_BPS) / 10000)
      : 0;
  const platformShareCents = product.priceCents - creatorShareCents;

  const order: StoreOrder = {
    id: randomUUID(),
    storeId: store.id,
    productId: product.id,
    buyerUserId: params.buyerUserId,
    amountCents: product.priceCents,
    creatorShareCents,
    platformShareCents,
    status: "simulated",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);

  if (product.sourceType === "dropship" && product.supplier) {
    const providerMap: Record<string, FulfillmentProvider> = {
      printful: "printful",
      printify: "printify",
      cj_dropshipping: "cj_dropshipping",
    };
    const provider = providerMap[product.supplier];
    if (provider) {
      void submitFulfillmentOrder({
        provider,
        quantity: 1,
        recipient: {
          name: "UR Platform Customer",
          address1: "Pending LLC checkout",
          city: "TBD",
          state: "IN",
          zip: "00000",
          country: "US",
        },
      });
    }
  }

  const checkout = calculateCustomerCheckout(product.priceCents, params.billingStateCode);
  recordTransaction({
    type: "other",
    payerUserId: params.buyerUserId,
    payerEmail: params.buyerEmail,
    amountCents: product.priceCents,
    description: `[Simulated] ${product.title} — ${store.name}`,
    status: "completed",
    metadata: {
      orderId: order.id,
      storeId: store.id,
      productId: product.id,
      simulated: true,
      chargeCents: checkout.totalCents,
      salesTaxCents: checkout.salesTaxCents,
      stripeFeeCents: checkout.stripeFeeCents,
    },
  });

  return { ...order, checkout };
}

export type StoreAnalytics = {
  storeId: string;
  storeName: string;
  activeProducts: number;
  totalViews: number;
  totalOrders: number;
  totalRevenueCents: number;
  topProducts: Array<{ id: string; title: string; orders: number; conversionRate: number }>;
  underperformers: Array<{ id: string; title: string; views: number; orders: number }>;
  trendingCategories: string[];
};

export function getStoreAnalytics(storeId: string): StoreAnalytics {
  const store = stores.get(storeId);
  if (!store) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
  }
  const list = listStoreProducts(storeId, true).filter((p) => p.status === "active");
  const totalViews = list.reduce((s, p) => s + p.views, 0);
  const totalOrders = list.reduce((s, p) => s + p.orders, 0);
  const totalRevenueCents = list.reduce((s, p) => s + p.revenueCents, 0);

  const topProducts = list
    .map((p) => ({
      id: p.id,
      title: p.title,
      orders: p.orders,
      conversionRate: p.views > 0 ? p.orders / p.views : 0,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 5);

  const underperformers = list
    .filter((p) => p.views >= 5 && p.orders === 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: p.title, views: p.views, orders: p.orders }));

  return {
    storeId,
    storeName: store.name,
    activeProducts: list.length,
    totalViews,
    totalOrders,
    totalRevenueCents,
    topProducts,
    underperformers,
    trendingCategories: getTrendingMarketCategories(),
  };
}

export function getTrendingMarketCategories(): string[] {
  return [
    "Creator desk accessories",
    "Portable lighting",
    "Wireless audio",
    "Custom apparel & POD",
    "Hydration & wellness",
    "Phone mounts & tripods",
    "Stream deck alternatives",
  ];
}

export type CatalogRotationResult = {
  archived: string[];
  activated: string[];
  summary: string;
};

export function rotateCatalog(storeId: string): CatalogRotationResult {
  const list = listStoreProducts(storeId, true);
  const active = list.filter((p) => p.status === "active");
  const paused = list.filter((p) => p.status === "paused");

  const archived: string[] = [];
  const activated: string[] = [];

  for (const p of active) {
    if (p.sourceType === "owner_digital") continue;
    if (p.views >= 10 && p.orders === 0) {
      p.status = "archived";
      p.updatedAt = new Date().toISOString();
      products.set(p.id, p);
      archived.push(p.title);
    }
  }

  for (const p of paused.slice(0, 2)) {
    p.status = "active";
    p.updatedAt = new Date().toISOString();
    products.set(p.id, p);
    activated.push(p.title);
  }

  return {
    archived,
    activated,
    summary: `Archived ${archived.length} underperformers; activated ${activated.length} paused SKUs.`,
  };
}

export function buildStoreManagerContext(params: {
  userId: string;
  isPlatformOwner: boolean;
}): string {
  ensurePlatformStore();
  const platform = stores.get(PLATFORM_STORE_ID)!;
  const platformAnalytics = getStoreAnalytics(platform.id);

  let context = `
## Live catalog snapshot (platform store)
Store: ${platform.name}
Active SKUs: ${platformAnalytics.activeProducts}
Total views: ${platformAnalytics.totalViews} | Orders: ${platformAnalytics.totalOrders} | Revenue: $${(platformAnalytics.totalRevenueCents / 100).toFixed(2)}

Top sellers:
${platformAnalytics.topProducts.map((p) => `- ${p.title}: ${p.orders} orders (${(p.conversionRate * 100).toFixed(1)}% conv)`).join("\n") || "- none yet"}

Underperformers (high views, zero orders):
${platformAnalytics.underperformers.map((p) => `- ${p.title}: ${p.views} views, 0 orders`).join("\n") || "- none flagged"}

Trending market categories:
${platformAnalytics.trendingCategories.map((c) => `- ${c}`).join("\n")}
`.trim();

  const creatorStore = getStoreForOwner(params.userId, "creator");
  if (creatorStore) {
    const ca = getStoreAnalytics(creatorStore.id);
    context += `

## Creator merch store (${creatorStore.name})
Slug: /shop/${creatorStore.slug}
Active products: ${ca.activeProducts} | Orders: ${ca.totalOrders} | Revenue: $${(ca.totalRevenueCents / 100).toFixed(2)}
Top: ${ca.topProducts.map((p) => p.title).join(", ") || "none yet"}
`;
  }

  context += `

## Owner original merch (ebooks, songs, physical)
List original ebooks, songs, and merch on the **platform shop only** (sourceType owner_digital). Those SKUs stay on the storefront during catalog rotation. UR keeps 100%. Checkout is still simulated until Stripe is live. Do **not** put owner goods in creator merch stores.

## Creator merch stores (separate area)
Enrolled creators already have their own shop at /shop/:slug and a Store tab in the Creator Dashboard. They list creator_merch there (85% creator / 15% UR). Never mix creator merch onto the platform shop.

## Affiliate programs (Amazon Associates + Walmart Affiliates)
Amazon and Walmart are the two retail networks wired here. They are sufficient for a large US merchandise catalog.
- Owner pastes an official amazon.com or walmart.com product URL. Tracking tags come from AMAZON_ASSOCIATE_TAG / WALMART_TRACKING_ID after program approval (placeholder your-* values in .env are ignored).
- Do not invent "high-paying" product URLs, ASINs, or guaranteed commissions. Suggest categories (lighting, mics, desk gear) and let the owner pick real listings.
- FTC: disclose that UR Platform LLC may earn a commission.
- Amazon Associates: no paid/incentivized reviews; do not hide the destination; do not use Amazon trademarks in ads except as their brand guidelines allow; qualifying purchases typically cookie ~24 hours.
- Walmart Affiliates: disclose the relationship; do not fabricate product claims; disclose AI-enhanced imagery if used.
- Affiliate/AI listings stay paused until the owner approves them in Administration.

## Your operational powers
- Recommend which products to pause, archive, or promote
- Draft product titles/descriptions with affiliate disclosure when needed
- Suggest new SKU ideas aligned with trending categories
- Explain simulated vs live checkout (live Stripe pending LLC setup)
- For platform owner: propose catalog rotation (archive weak, activate paused)
- Coordinate with AI 3D Designer for merch mockups and ContentMate for promo posts
`;

  return context;
}

export function assertCanManageStore(params: {
  userId: string;
  storeId: string;
  isPlatformOwner: boolean;
}): CommerceStore {
  const store = stores.get(params.storeId);
  if (!store) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Store not found." });
  }
  if (store.kind === "platform" && !params.isPlatformOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform store is managed by the platform owner." });
  }
  if (store.kind === "creator" && store.ownerUserId !== params.userId && !params.isPlatformOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only manage your own creator store." });
  }
  return store;
}

export function listCreatorStores(limit = 20): CommerceStore[] {
  ensurePlatformStore();
  return [...stores.values()].filter((s) => s.kind === "creator").slice(0, limit);
}

export function canUseStoreManagerAi(params: {
  userId: string;
  isPlatformOwner: boolean;
}): boolean {
  if (params.isPlatformOwner) return true;
  return Boolean(getContentCreatorProfile(params.userId));
}
