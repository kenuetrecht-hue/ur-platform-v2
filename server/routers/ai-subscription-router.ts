import { z } from "zod";
import { secureProcedure, securePublicProcedure, secureCheckoutProcedure, router, TRPCError } from "../_core/trpc";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
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
  getAiSubscriptionPlans,
  getConcurrentSlotPlans,
  getConcurrentSlotPriceCents,
  getPlatformPassPriceCents,
  INCLUDED_CONCURRENT_AI_SLOTS,
  type AiSubscriptionPlan,
} from "../../lib/ai-subscription-pricing";
import { getUsageAllowanceQuote } from "../../lib/ai-usage-allowances";
import { getAiUsageStatus } from "../_core/ai-usage-meter";
import { getUsageDashboard } from "../_core/usage-dashboard-service";
import {
  getConcurrentSlotQuote,
  purchaseExtraConcurrentSlot,
} from "../_core/ai-platform-pass-slots";
import { buildSubscriptionPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed, paymentChannelNote } from "../_core/payment-channel-guard";
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
      const creatorName = getCreatorAi(input.creatorId)?.name ?? "AI Specialist";
      return {
        creatorId: input.creatorId,
        creatorName,
        tier: "standard" as const,
        tierLabel: "Platform pass",
        includedConcurrentSlots: INCLUDED_CONCURRENT_AI_SLOTS,
        concurrentSlotPlans: getConcurrentSlotPlans(),
        plans: plans.map((p) => ({
          ...p,
          ...getUsageAllowanceQuote(p.plan, "standard"),
          requiredPaymentChannel: "web_browser" as const,
          purchaseSummary: buildSubscriptionPurchaseSummary({
            creatorId: input.creatorId,
            creatorName,
            plan: p.plan,
            tier: "standard",
            tierLabel: "Platform pass",
            stateCode: input.stateCode ?? null,
          }),
        })),
        usageNote:
          "Day, week, or month unlocks every UR specialist — one at a time. Hive and Town Hall need an extra concurrent slot. Hive = 3 messages · Learn/chapters = 5 · 10 web searches/day included.",
        pricingNote: AI_SUBSCRIPTION_PRICING_SUMMARY,
        paymentNote: "AI subscriptions must be purchased through your web browser — not in the mobile app.",
        baseNote:
          "Platform text pass — $7.99/day, $15.99/week, $24.99/month. Talk to every AI one at a time. Extra concurrent slot: $4.99/day · $9.99/week · $14.99/month.",
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
          slots: getConcurrentSlotQuote(userId),
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
        slots: getConcurrentSlotQuote(userId),
      };
    }),

  mySubscriptions: secureProcedure("aiSubscription").query(({ ctx }) =>
    listUserAiSubscriptions(String(ctx.user.id)),
  ),

  purchase: secureCheckoutProcedure("aiSubscription")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        plan: planSchema,
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      assertSimulatedPurchaseAllowed();
      const userId = String(ctx.user.id);
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required." });
      }

      const priceCents = getPlatformPassPriceCents(input.plan as AiSubscriptionPlan);
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
      const receipt = buildSubscriptionPurchaseSummary({
        creatorId: input.creatorId,
        creatorName,
        plan: input.plan as AiSubscriptionPlan,
        tier: "standard",
        tierLabel: "Platform pass",
        stateCode: input.stateCode,
      });

      return {
        ok: true as const,
        subscription: record,
        receipt,
        tracker: getUsageDashboard({
          userId,
          email,
          creatorId: input.creatorId,
          isPlatformOwner: false,
        }),
        message: formatPurchaseReceiptMessage(receipt),
        expiresAt: record.expiresAt,
        paymentChannel: paymentChannelNote(priceCents),
      };
    }),

  purchaseConcurrentSlot: secureCheckoutProcedure("aiSubscription")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        plan: planSchema,
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      assertSimulatedPurchaseAllowed();
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required." });
      }
      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner already has full concurrent AI access.",
        });
      }

      const priceCents = getConcurrentSlotPriceCents(input.plan as AiSubscriptionPlan);
      assertPaymentChannelAllowed({
        subtotalCents: priceCents,
        clientPlatform: input.clientPlatform,
      });

      const lot = purchaseExtraConcurrentSlot({
        userId: String(ctx.user.id),
        userEmail: email,
        creatorId: input.creatorId,
        plan: input.plan as AiSubscriptionPlan,
        billingStateCode: input.stateCode,
      });

      return {
        ok: true as const,
        lot,
        slots: getConcurrentSlotQuote(String(ctx.user.id)),
        paymentChannel: paymentChannelNote(priceCents),
        message:
          "Extra concurrent slot added. You can talk to more than one AI at a time until it expires.",
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
