import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import { getAccessStatus } from "../_core/access-entitlements";
import {
  cancelWorkspace3dSubscription,
  getActiveWorkspace3dSubscription,
  getWorkspace3dAccessQuote,
  purchaseWorkspace3dExtraSlot,
  purchaseWorkspace3dPlan,
} from "../_core/workspace-3d-subscription-service";
import {
  getWorkspace3dPlans,
  getWorkspace3dPlanPriceCents,
  WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
  WORKSPACE_3D_PRICING_SUMMARY,
  type Workspace3dPlanId,
} from "../../lib/workspace-3d-pricing";
import {
  buildWorkspace3dPurchaseSummary,
  buildWorkspace3dExtraSlotPurchaseSummary,
  formatPurchaseReceiptMessage,
} from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed, paymentChannelNote } from "../_core/payment-channel-guard";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";

const clientPlatformSchema = z.enum(["web", "native"]);
const planSchema = z.enum(["day_pass", "solo", "pro", "studio"]);

export const workspace3dRouter = router({
  getPlans: securePublicProcedure("workspace3d")
    .input(z.object({ stateCode: optionalBillingStateSchema }))
    .query(({ input }) => ({
      plans: getWorkspace3dPlans().map((p) => ({
        ...p,
        requiredPaymentChannel: "web_browser" as const,
        purchaseSummary: buildWorkspace3dPurchaseSummary({
          planId: p.planId,
          stateCode: input.stateCode ?? null,
        }),
      })),
      extraAiSlot: {
        priceCents: WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
        priceDisplay: `$${(WORKSPACE_3D_EXTRA_AI_SLOT_CENTS / 100).toFixed(2)}`,
        requiredPaymentChannel: "web_browser" as const,
        purchaseSummary: buildWorkspace3dExtraSlotPurchaseSummary(input.stateCode ?? null),
      },
      pricingNote: WORKSPACE_3D_PRICING_SUMMARY,
      paymentNote: "Workspace plans must be purchased through your web browser — not in the mobile app.",
      usageNote:
        "Workspace access covers the 3D lab and concurrent AI slots. Text chat still requires each specialist's plan; voice uses Talk Time.",
    })),

  getAccess: secureProcedure("workspace3d").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    if (ctx.isPlatformOwner) {
      return {
        ...getWorkspace3dAccessQuote(userId, true),
        source: "owner" as const,
        subscription: null,
      };
    }

    const platform = getAccessStatus({
      userId: ctx.user.id,
      email: ctx.user.email,
      isPlatformOwner: false,
    });
    if (platform.hasAiAccess) {
      return {
        hasAccess: true,
        maxConcurrentAiSlots: 8,
        plan: null,
        extraAiSlots: 0,
        expiresAt: null,
        source: platform.source,
        subscription: null,
      };
    }

    const subscription = getActiveWorkspace3dSubscription(userId);
    const access = getWorkspace3dAccessQuote(userId, false);
    return {
      ...access,
      source: subscription ? ("workspace_3d" as const) : ("none" as const),
      subscription,
    };
  }),

  purchase: secureProcedure("workspace3d")
    .input(
      z.object({
        plan: planSchema,
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      assertSimulatedPurchaseAllowed();
      assertSectionEnabledForRequest("3d_workspace", ctx.isPlatformOwner);
      const userId = String(ctx.user.id);
      const email = ctx.user.email;
      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account email required." });
      }

      const priceCents = getWorkspace3dPlanPriceCents(input.plan as Workspace3dPlanId);
      assertPaymentChannelAllowed({
        subtotalCents: priceCents,
        clientPlatform: input.clientPlatform,
      });

      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner already has full workspace access.",
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
          message: "You already have platform-wide access including the 3D workspace.",
        });
      }

      const record = purchaseWorkspace3dPlan({
        userId,
        userEmail: email,
        plan: input.plan as Workspace3dPlanId,
        billingStateCode: input.stateCode,
        source: "simulated",
      });

      const receipt = buildWorkspace3dPurchaseSummary({
        planId: input.plan as Workspace3dPlanId,
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

  purchaseExtraSlot: secureProcedure("workspace3d")
    .input(
      z.object({
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

      assertPaymentChannelAllowed({
        subtotalCents: WORKSPACE_3D_EXTRA_AI_SLOT_CENTS,
        clientPlatform: input.clientPlatform,
      });

      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner already has full workspace access.",
        });
      }

      const record = purchaseWorkspace3dExtraSlot({
        userId,
        userEmail: email,
        billingStateCode: input.stateCode,
        source: "simulated",
      });

      const receipt = buildWorkspace3dExtraSlotPurchaseSummary(input.stateCode);

      return {
        ok: true as const,
        subscription: record,
        receipt,
        message: formatPurchaseReceiptMessage(receipt),
        expiresAt: record.expiresAt,
        paymentChannel: paymentChannelNote(WORKSPACE_3D_EXTRA_AI_SLOT_CENTS),
      };
    }),

  cancel: secureProcedure("workspace3d").mutation(({ ctx }) => {
    const ok = cancelWorkspace3dSubscription(String(ctx.user.id));
    if (!ok) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active workspace subscription found." });
    }
    return { ok: true as const };
  }),
});
