import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import {
  type BillingPeriod,
  type CreditProductId,
  CREDIT_PRODUCTS,
  getCreditUpgradeOptions,
  getTextSubscriptionUpgradeOptions,
} from "../../lib/usage-caps-catalog";
import {
  buildCreditProductPlainPricing,
  buildTextSubscriptionPlainPlans,
  getPlatformPricingCatalog,
} from "../../lib/pricing-transparency";
import {
  getAllCreditBalances,
  getCreditBalance,
  getIncludedWebSearchRemaining,
  grantCreditLot,
} from "../_core/usage-credits-service";
import { getUsageDashboard } from "../_core/usage-dashboard-service";
import { assertSimulatedPurchaseAllowed, assertPaymentChannelAllowed } from "../_core/payment-channel-guard";
import { billingStateSchema } from "../../lib/billing-state-schema";
import { formatUsd, getAiPriceTier } from "../../lib/ai-subscription-pricing";
import { getActiveAiSubscription } from "../_core/ai-subscription-service";
import { getAiUsageStatus } from "../_core/ai-usage-meter";
import { liveCreditQuote, liveTextPassCents } from "../_core/owner-price-catalog-service";

const productIdSchema = z.enum([
  "images-imagen",
  "images-vision",
  "code-techbuilder",
  "code-techbuilder-studio",
  "code-gameforge",
  "longform-author",
  "search-web",
  "hive-consult",
  "voice-talk",
]);

const periodSchema = z.enum(["day", "week", "month"]);

export const usageCreditsRouter = router({
  getCatalog: securePublicProcedure("usageCredits").query(async () => {
    const products = await Promise.all(
      Object.values(CREDIT_PRODUCTS).map(async (p) => {
        const plans = await Promise.all(
          p.plans.map(async (plan) => {
            const quote = await liveCreditQuote({
              productId: p.id,
              period: plan.period,
            });
            const priceCents = quote?.priceCents ?? plan.priceCents;
            return {
              period: plan.period,
              priceDisplay: formatUsd(priceCents),
              priceCents,
              included: plan.included,
              durationDays: plan.durationDays,
              payReceiveLine: `You pay ${formatUsd(priceCents)} → You get ${plan.included} ${p.unit}`,
            };
          }),
        );
        const addons = await Promise.all(
          (p.addons ?? []).map(async (a) => {
            const quote = await liveCreditQuote({
              productId: p.id,
              addonId: a.id,
            });
            const priceCents = quote?.priceCents ?? a.priceCents;
            return {
              id: a.id,
              label: a.label,
              priceDisplay: formatUsd(priceCents),
              priceCents,
              included: a.included,
              payReceiveLine: `You pay ${formatUsd(priceCents)} → You get ${a.included} ${p.unit}`,
            };
          }),
        );
        return {
          id: p.id,
          label: p.label,
          unit: p.unit,
          dailyHardCap: p.dailyHardCap,
          plain: buildCreditProductPlainPricing(p.id),
          plans,
          addons,
        };
      }),
    );
    return {
      headline: "You pay a clear price → You receive a fixed number of credits. No hidden unlimited use.",
      textSubscriptionExample: buildTextSubscriptionPlainPlans("ai-wellness-001"),
      platformCatalog: getPlatformPricingCatalog(),
      products,
    };
  }),

  getMyBalances: secureProcedure("usageCredits").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    return {
      balances: ctx.isPlatformOwner
        ? Object.keys(CREDIT_PRODUCTS).map((id) => ({
            ...getCreditBalance(userId, id as CreditProductId),
            remaining: 999_999,
          }))
        : getAllCreditBalances(userId),
    };
  }),

  getMyTracker: secureProcedure("usageCredits")
    .input(
      z.object({
        creatorId: z.string().trim().min(1).max(64).optional(),
      }).optional(),
    )
    .query(({ ctx, input }) =>
      getUsageDashboard({
        userId: String(ctx.user.id),
        email: ctx.user.email,
        creatorId: input?.creatorId,
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  getUpgradeOptions: secureProcedure("usageCredits")
    .input(
      z.object({
        productId: productIdSchema,
        creatorId: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = String(ctx.user.id);
      const balance = getCreditBalance(userId, input.productId);
      const creditOptions = await Promise.all(
        getCreditUpgradeOptions({
          productId: input.productId,
          currentPeriod:
            balance.activePeriod && balance.activePeriod !== "addon"
              ? balance.activePeriod
              : null,
          currentRemaining: balance.remaining,
        }).map(async (option) => {
          const quote = await liveCreditQuote({
            productId: input.productId,
            period: option.period === "addon" ? undefined : (option.period as BillingPeriod),
            addonId: option.addonId,
          });
          const priceCents = quote?.priceCents ?? option.priceCents;
          return {
            ...option,
            priceCents,
            priceDisplay: formatUsd(priceCents),
          };
        }),
      );

      let textOptions: ReturnType<typeof getTextSubscriptionUpgradeOptions> = [];
      if (input.creatorId) {
        const sub = getActiveAiSubscription(userId, input.creatorId);
        const usage = getAiUsageStatus({
          userId,
          email: ctx.user.email,
          creatorId: input.creatorId,
          isPlatformOwner: ctx.isPlatformOwner,
        });
        textOptions = await Promise.all(
          getTextSubscriptionUpgradeOptions({
            tier: getAiPriceTier(input.creatorId),
            creatorId: input.creatorId,
            currentPlan: sub?.plan ?? null,
            messagesRemaining: usage.messagesRemaining,
          }).map(async (option) => {
            const priceCents = await liveTextPassCents(option.period as "day" | "week" | "month");
            return {
              ...option,
              priceCents,
              priceDisplay: formatUsd(priceCents),
            };
          }),
        );
      }

      return {
        productId: input.productId,
        balance,
        creditUpgradeOptions: creditOptions,
        textUpgradeOptions: textOptions,
        includedWebSearchesToday: input.creatorId
          ? getIncludedWebSearchRemaining(userId, input.creatorId)
          : 0,
      };
    }),

  purchase: secureProcedure("usageCredits")
    .input(
      z.object({
        productId: productIdSchema,
        period: periodSchema.optional(),
        addonId: z.string().trim().max(64).optional(),
        stateCode: billingStateSchema,
        clientPlatform: z.enum(["web", "native"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      assertSimulatedPurchaseAllowed();
      const resolved = await liveCreditQuote({
        productId: input.productId,
        period: input.period as BillingPeriod | undefined,
        addonId: input.addonId,
      });
      if (!resolved) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan or add-on." });
      }

      assertPaymentChannelAllowed({
        subtotalCents: resolved.priceCents,
        clientPlatform: input.clientPlatform,
      });

      const lot = grantCreditLot({
        userId: String(ctx.user.id),
        productId: input.productId,
        period: input.period as BillingPeriod | undefined,
        addonId: input.addonId,
        priceCents: resolved.priceCents,
        source: "simulated",
      });

      const product = CREDIT_PRODUCTS[input.productId];
      const balance = getCreditBalance(String(ctx.user.id), input.productId);
      return {
        ok: true as const,
        lot,
        tracker: balance,
        message: `Added ${lot.included} ${product.unit} (${formatUsd(lot.priceCents)}). ${balance.usedLeftLine}. ${product.dailyHardCap}/day max.`,
      };
    }),
});
