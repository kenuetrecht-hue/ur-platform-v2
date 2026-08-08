import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import { isCreatorAiId, getCreatorAi } from "../_core/ai-creator-registry";
import { getAccessStatus } from "../_core/access-entitlements";
import {
  cancelAiSubscription,
  getActiveAiSubscription,
  hasActiveAiSubscription,
  listUserAiSubscriptions,
  purchaseAiSubscription,
} from "../_core/ai-subscription-service";
import {
  getAiPriceTier,
  getAiSubscriptionPlans,
  AI_PRICE_TIER_LABEL,
  type AiSubscriptionPlan,
} from "../../lib/ai-subscription-pricing";
import { getUsageAllowanceQuote } from "../../lib/ai-usage-allowances";
import { getAiUsageStatus } from "../_core/ai-usage-meter";
import { buildSubscriptionPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed, paymentChannelNote } from "../_core/payment-channel-guard";
import { getPlanPriceCents } from "../../lib/ai-subscription-pricing";
import { AI_SUBSCRIPTION_PRICING_SUMMARY } from "../../lib/payment-channel-policy";

const clientPlatformSchema = z.enum(["web", "native"]);

const creatorIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isCreatorAiId, { message: "Unknown AI assistant." });

const planSchema = z.enum(["day", "week", "month"]);

export const aiSubscriptionRouter = router({
  /** Public — show plans before login */
  getPlans: securePublicProcedure("aiSubscription")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        stateCode: optionalBillingStateSchema,
      }),
    )
    .query(({ input }) => {
      const plans = getAiSubscriptionPlans(input.creatorId);
      const tier = getAiPriceTier(input.creatorId);
      const creatorName = getCreatorAi(input.creatorId)?.name ?? "AI Specialist";
      return {
        creatorId: input.creatorId,
        creatorName,
        tier,
        tierLabel: AI_PRICE_TIER_LABEL[tier],
        plans: plans.map((p) => ({
          ...p,
          ...getUsageAllowanceQuote(p.plan, tier),
          requiredPaymentChannel: "web_browser" as const,
          purchaseSummary: buildSubscriptionPurchaseSummary({
            creatorId: input.creatorId,
            creatorName,
            plan: p.plan,
            tier,
            tierLabel: AI_PRICE_TIER_LABEL[tier],
            stateCode: input.stateCode ?? null,
          }),
        })),
        usageNote: "Each plan includes a message allowance sized to cover API costs. Hive consults use 3 messages.",
        pricingNote: AI_SUBSCRIPTION_PRICING_SUMMARY,
        paymentNote: "AI subscriptions must be purchased through your web browser — not in the mobile app.",
        baseNote:
          "Flat pricing for every AI on the platform — $5.99/day (24 hours), $9.99/week, $14.99/month.",
      };
    }),

  getAccess: secureProcedure("aiSubscription")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input, ctx }) => {
      const userId = String(ctx.user.id);
      const platform = getAccessStatus({
        userId: ctx.user.id,
        email: ctx.user.email,
        isPlatformOwner: ctx.isPlatformOwner,
      });

      if (ctx.isPlatformOwner || platform.hasAiAccess) {
        return {
          hasAccess: true,
          source: ctx.isPlatformOwner ? ("owner" as const) : platform.source,
          subscription: null,
        };
      }

      const subscription = getActiveAiSubscription(userId, input.creatorId);
      const usage = getAiUsageStatus({
        userId,
        email: ctx.user.email,
        creatorId: input.creatorId,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      return {
        hasAccess: Boolean(subscription),
        source: subscription ? ("ai_subscription" as const) : ("none" as const),
        subscription,
        usage,
      };
    }),

  mySubscriptions: secureProcedure("aiSubscription").query(({ ctx }) =>
    listUserAiSubscriptions(String(ctx.user.id)),
  ),

  purchase: secureProcedure("aiSubscription")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        plan: planSchema,
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      assertSimulatedPurchaseAllowed();
      const userId = String(ctx.user.id);
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required." });
      }

      const priceCents = getPlanPriceCents(input.creatorId, input.plan as AiSubscriptionPlan);
      assertPaymentChannelAllowed({
        subtotalCents: priceCents,
        clientPlatform: input.clientPlatform,
      });

      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner already has full AI access.",
        });
      }

      const platform = getAccessStatus({
        userId: ctx.user.id,
        email,
        isPlatformOwner: false,
      });
      if (platform.hasAiAccess) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have platform-wide AI access.",
        });
      }

      const record = purchaseAiSubscription({
        userId,
        userEmail: email,
        creatorId: input.creatorId,
        plan: input.plan as AiSubscriptionPlan,
        billingStateCode: input.stateCode,
        isContentCreator: false,
        source: "simulated",
      });

      const creatorName = getCreatorAi(input.creatorId)?.name ?? "AI Specialist";
      const tier = getAiPriceTier(input.creatorId);
      const receipt = buildSubscriptionPurchaseSummary({
        creatorId: input.creatorId,
        creatorName,
        plan: input.plan as AiSubscriptionPlan,
        tier,
        tierLabel: AI_PRICE_TIER_LABEL[tier],
        stateCode: input.stateCode,
      });

      return {
        ok: true as const,
        subscription: record,
        receipt,
        message: formatPurchaseReceiptMessage(receipt),
        expiresAt: record.expiresAt,
        paymentChannel: paymentChannelNote(priceCents),
      };
    }),

  cancel: secureProcedure("aiSubscription")
    .input(z.object({ creatorId: creatorIdSchema }))
    .mutation(({ input, ctx }) => {
      const ok = cancelAiSubscription(String(ctx.user.id), input.creatorId);
      if (!ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found." });
      }
      return { ok: true as const };
    }),

  checkActive: secureProcedure("aiSubscription")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input, ctx }) => ({
      active:
        ctx.isPlatformOwner ||
        getAccessStatus({
          userId: ctx.user.id,
          email: ctx.user.email,
          isPlatformOwner: ctx.isPlatformOwner,
        }).hasAiAccess ||
        hasActiveAiSubscription(ctx.user.id, ctx.user.email, input.creatorId),
    })),
});
