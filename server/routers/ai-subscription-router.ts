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
import { formatUsd, getAiSubscriptionPlans, getConcurrentSlotPlans, INCLUDED_CONCURRENT_AI_SLOTS, type AiSubscriptionPlan } from "../../lib/ai-subscription-pricing";
import { getUsageAllowanceQuote } from "../../lib/ai-usage-allowances";
import { getAiUsageStatus } from "../_core/ai-usage-meter";
import { getUsageDashboard } from "../_core/usage-dashboard-service";
import {
  getConcurrentSlotQuote,
  purchaseExtraConcurrentSlot,
} from "../_core/ai-platform-pass-slots";
import { buildSubscriptionPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import type { UsStateCode } from "../../lib/us-state-taxes";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed, paymentChannelNote } from "../_core/payment-channel-guard";
import { liveSlotCents, liveTextPassCents } from "../_core/owner-price-catalog-service";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import { requireWorldAccess } from "./conduct-router";
import {
  buildTextPassPurchaseAgreement,
  serializePurchaseAgreement,
} from "../../lib/digital-purchase-agreements";

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
    .query(async ({ input }) => {
      const plans = getAiSubscriptionPlans(input.creatorId);
      const creatorName = getCreatorAi(input.creatorId)?.name ?? "AI Specialist";
      const liveDayCents = await liveTextPassCents("day");
      const livePlans = await Promise.all(
        plans.map(async (p) => {
          const priceCents = await liveTextPassCents(p.plan);
          let savingsVsDaily = p.savingsVsDaily;
          if (p.plan !== "day") {
            const equivalentDaily = liveDayCents * p.durationDays;
            savingsVsDaily =
              equivalentDaily > priceCents
                ? `Save $${((equivalentDaily - priceCents) / 100).toFixed(2)} vs daily`
                : undefined;
          }
          return {
            ...p,
            ...getUsageAllowanceQuote(p.plan, "standard"),
            priceCents,
            priceDisplay: formatUsd(priceCents),
            savingsVsDaily,
            requiredPaymentChannel: "web_browser" as const,
            purchaseSummary: buildSubscriptionPurchaseSummary({
              creatorId: input.creatorId,
              creatorName,
              plan: p.plan,
              tier: "standard",
              tierLabel: "Platform pass",
              stateCode: (input.stateCode ?? null) as UsStateCode | null,
              priceCents,
            }),
            agreement: buildTextPassPurchaseAgreement(p.plan, priceCents),
          };
        }),
      );
      const concurrentSlotPlans = await Promise.all(
        getConcurrentSlotPlans().map(async (p) => {
          const priceCents = await liveSlotCents(p.plan);
          return {
            ...p,
            priceCents,
            priceDisplay: formatUsd(priceCents),
          };
        }),
      );
      return {
        creatorId: input.creatorId,
        creatorName,
        tier: "standard" as const,
        tierLabel: "Platform pass",
        includedConcurrentSlots: INCLUDED_CONCURRENT_AI_SLOTS,
        concurrentSlotPlans,
        plans: livePlans,
        usageNote:
          "Day, week, or month unlocks every UR specialist — one at a time. Leftover messages die when the pass ends. Mic print = 1 message. Hear is Talk Time, sold separately. Hive and Town Hall need an extra concurrent slot. Hive = 3 messages · Learn/chapters = 5 · 10 web searches/day included.",
        pricingNote: "Amounts on each card are the current checkout prices.",
        paymentNote: "AI subscriptions must be purchased through your web browser — not in the mobile app.",
        baseNote:
          "Platform text pass — talk to every AI one at a time. Extra concurrent slots are listed below.",
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
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      assertSimulatedPurchaseAllowed();
      const userId = String(ctx.user.id);
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required." });
      }

      const priceCents = await liveTextPassCents(input.plan as AiSubscriptionPlan);
      assertPaymentChannelAllowed({
        subtotalCents: priceCents,
        clientPlatform: input.clientPlatform,
      });

      const agreement = buildTextPassPurchaseAgreement(input.plan as AiSubscriptionPlan, priceCents);
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: email,
        sku: `text.${input.plan}`,
        amountCents: priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
        agreementVersion: agreement.version,
        agreementText: serializePurchaseAgreement(agreement),
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
        priceCents,
      });

      const creatorName = getCreatorAi(input.creatorId)?.name ?? "AI Specialist";
      const receipt = buildSubscriptionPurchaseSummary({
        creatorId: input.creatorId,
        creatorName,
        plan: input.plan as AiSubscriptionPlan,
        tier: "standard",
        tierLabel: "Platform pass",
        stateCode: input.stateCode as UsStateCode,
        priceCents,
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
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
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

      const priceCents = await liveSlotCents(input.plan as AiSubscriptionPlan);
      assertPaymentChannelAllowed({
        subtotalCents: priceCents,
        clientPlatform: input.clientPlatform,
      });

      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: email,
        sku: `slot.${input.plan}`,
        amountCents: priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });

      const lot = purchaseExtraConcurrentSlot({
        userId: String(ctx.user.id),
        userEmail: email,
        creatorId: input.creatorId,
        plan: input.plan as AiSubscriptionPlan,
        billingStateCode: input.stateCode,
        priceCents,
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
