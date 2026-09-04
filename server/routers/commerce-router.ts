import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { secureProcedure, secureCheckoutProcedure, publicProcedure, ownerProcedure, router } from "../_core/trpc";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import {
  STORE_MANAGER_AI_ID,
  addStoreProduct,
  assertCanManageStore,
  buildStoreManagerContext,
  ensureCreatorStore,
  ensurePlatformStore,
  getProductWithApproval,
  getStoreAnalytics,
  getStoreBySlug,
  listCreatorStores,
  listPublicStoreProducts,
  listStoreProducts,
  recordProductClick,
  recordProductView,
  rotateCatalog,
  simulateProductPurchase,
  updateProductStatus,
} from "../_core/commerce-catalog-service";
import {
  AFFILIATE_AI_COMPLIANCE_RULES,
  approveAffiliateProduct,
} from "../_core/commerce-affiliate-compliance";
import {
  buildAffiliateOutboundUrl,
  getCommerceProviderStatus,
  syncCatalogFromProvider,
  type FulfillmentProvider,
} from "../_core/commerce-fulfillment-adapters";
import { getContentCreatorProfile } from "../_core/partner-program-service";
import { sanitizeUserText } from "../_core/input-sanitize";
import { affiliateNetworkFromUrl, OWNER_DIGITAL_KINDS } from "../../lib/affiliate-link-policy";

export const commerceRouter = router({
  /** Provider readiness — add API keys in .env when you sign up with each company. */
  providerStatus: publicProcedure.query(() => ({
    providers: getCommerceProviderStatus(),
    complianceRules: AFFILIATE_AI_COMPLIANCE_RULES,
  })),

  buildAffiliateLink: secureProcedure("commerce")
    .input(
      z.object({
        provider: z.enum(["amazon_associates", "walmart_affiliate"]),
        productUrl: z.string().url().max(2000),
      }),
    )
    .mutation(({ input }) => ({
      url: buildAffiliateOutboundUrl(input),
    })),

  syncProviderCatalog: ownerProcedure
    .input(z.object({ provider: z.enum(["printful", "printify", "cj_dropshipping"]) }))
    .mutation(({ input }) => syncCatalogFromProvider(input.provider as FulfillmentProvider)),

  platformShop: publicProcedure.query(() => {
    const store = ensurePlatformStore();
    return {
      store,
      products: listPublicStoreProducts(store.id),
    };
  }),

  shopBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(64) }))
    .query(({ input }) => {
      const store = getStoreBySlug(input.slug);
      if (!store) return null;
      return {
        store,
        products: listPublicStoreProducts(store.id),
      };
    }),

  listCreatorShops: publicProcedure.query(() => listCreatorStores()),

  pendingAffiliateApprovals: ownerProcedure.query(() => {
    const store = ensurePlatformStore();
    return listStoreProducts(store.id, true)
      .map((p) => getProductWithApproval(p.id))
      .filter((p) => p && p.approval === "pending");
  }),

  ownerPlatformCatalog: ownerProcedure.query(() => {
    const store = ensurePlatformStore();
    return {
      store,
      products: listStoreProducts(store.id, true).map((p) => ({
        ...p,
        approval: getProductWithApproval(p.id)?.approval ?? "not_required",
      })),
    };
  }),

  approveAffiliateProduct: ownerProcedure
    .input(z.object({ productId: z.string().uuid(), approved: z.boolean() }))
    .mutation(({ ctx, input }) => {
      const result = approveAffiliateProduct({
        productId: input.productId,
        approved: input.approved,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      const product = getProductWithApproval(input.productId);
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      }
      updateProductStatus({
        productId: input.productId,
        storeId: product.storeId,
        status: result.productStatus,
      });
      return result;
    }),

  myCreatorStore: secureProcedure("commerce").query(({ ctx }) => {
    const profile = getContentCreatorProfile(String(ctx.user.id));
    if (!profile && !ctx.isPlatformOwner) {
      return { enrolled: false as const, store: null, products: [] };
    }
    const store = ensureCreatorStore({
      userId: String(ctx.user.id),
      displayName: ctx.user.name ?? "Creator",
      email: ctx.user.email ?? "",
    });
    return {
      enrolled: true as const,
      store,
      products: listStoreProducts(store.id).map((p) => ({
        ...p,
        approval: getProductWithApproval(p.id)?.approval ?? "not_required",
      })),
      analytics: getStoreAnalytics(store.id),
    };
  }),

  storeAnalytics: secureProcedure("commerce")
    .input(z.object({ storeId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      assertCanManageStore({
        userId: String(ctx.user.id),
        storeId: input.storeId,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      return getStoreAnalytics(input.storeId);
    }),

  storeManagerContext: secureProcedure("commerce").query(({ ctx }) =>
    buildStoreManagerContext({
      userId: String(ctx.user.id),
      isPlatformOwner: ctx.isPlatformOwner,
    }),
  ),

  addProduct: secureProcedure("commerce")
    .input(
      z.object({
        storeId: z.string().min(1),
        title: z.string().min(1).max(120),
        description: z.string().max(2000).default(""),
        priceCents: z.number().int().min(99).max(999999),
        imageUrl: z.string().max(2000).optional(),
        sourceType: z.enum(["dropship", "affiliate", "creator_merch", "owner_digital"]),
        affiliateUrl: z.string().max(2000).optional(),
        supplier: z.string().max(64).optional(),
        category: z.string().max(64).optional(),
        tags: z.array(z.string().max(32)).max(10).optional(),
        aiAssisted: z.boolean().optional(),
        digitalKind: z.enum(OWNER_DIGITAL_KINDS).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const store = assertCanManageStore({
        userId: String(ctx.user.id),
        storeId: input.storeId,
        isPlatformOwner: ctx.isPlatformOwner,
      });

      if (input.sourceType === "creator_merch") {
        if (store.kind !== "creator") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Creator merch belongs in the creator's own store, not the UR shop.",
          });
        }
      } else {
        if (store.kind !== "platform") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Owner originals and affiliate picks list on the UR shop only. Creators keep their own merch stores.",
          });
        }
        if (!ctx.isPlatformOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the platform owner may list products on the UR shop.",
          });
        }
      }

      let affiliateUrl = input.affiliateUrl?.trim();
      let supplier = input.supplier;
      if (input.sourceType === "affiliate") {
        if (!affiliateUrl) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Paste an official Amazon or Walmart product URL.",
          });
        }
        const network = affiliateNetworkFromUrl(affiliateUrl);
        if (!network) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Affiliate listings must be official amazon.com or walmart.com product pages.",
          });
        }
        supplier = network;
        affiliateUrl = buildAffiliateOutboundUrl({ provider: network, productUrl: affiliateUrl });
      }

      const product = addStoreProduct({
        storeId: input.storeId,
        title: sanitizeUserText(input.title, 120),
        description: sanitizeUserText(input.description, 2000),
        priceCents: input.priceCents,
        imageUrl: input.imageUrl ? sanitizeUserText(input.imageUrl, 2000) : undefined,
        sourceType: input.sourceType,
        affiliateUrl,
        supplier,
        category: input.category ? sanitizeUserText(input.category, 64) : undefined,
        tags: input.tags?.map((t) => sanitizeUserText(t, 32)).filter(Boolean),
        aiAssisted: input.aiAssisted,
        digitalKind: input.sourceType === "owner_digital" ? (input.digitalKind ?? "other") : undefined,
      });
      return {
        ...product,
        approval: getProductWithApproval(product.id)?.approval ?? "not_required",
        pendingOwnerApproval: product.status === "paused",
      };
    }),

  setProductStatus: secureProcedure("commerce")
    .input(
      z.object({
        storeId: z.string().min(1),
        productId: z.string().uuid(),
        status: z.enum(["active", "paused", "archived"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertCanManageStore({
        userId: String(ctx.user.id),
        storeId: input.storeId,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      return updateProductStatus(input);
    }),

  viewProduct: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(({ input }) => {
      recordProductView(input.productId);
      return { ok: true as const };
    }),

  clickProduct: publicProcedure
    .input(z.object({ productId: z.string().uuid() }))
    .mutation(({ input }) => {
      recordProductClick(input.productId);
      return { ok: true as const };
    }),

  simulatePurchase: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        productId: z.string().uuid(),
        billingStateCode: z.string().trim().length(2).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      return simulateProductPurchase({
        productId: input.productId,
        buyerUserId: String(ctx.user.id),
        buyerEmail: ctx.user.email ?? "",
        billingStateCode: input.billingStateCode,
      });
    }),

  rotateCatalog: ownerProcedure
    .input(z.object({ storeId: z.string().min(1) }))
    .mutation(({ input }) => {
      const store = ensurePlatformStore();
      if (input.storeId !== store.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner catalog rotation is for the platform store." });
      }
      return rotateCatalog(input.storeId);
    }),

  storeManagerAiId: publicProcedure.query(() => ({ creatorId: STORE_MANAGER_AI_ID })),
});
