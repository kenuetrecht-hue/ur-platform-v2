import { z } from "zod";
import { router, secureProcedure, secureCheckoutProcedure, TRPCError } from "../_core/trpc";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import { getCreatorTipPack } from "../../lib/creator-tips";
import { getCreatorTipsCatalog, sendCreatorTip } from "../_core/creator-tips-service";
import {
  getCommerceMode,
  isSimulatedCommerceMode,
  LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
} from "../../lib/dev-commerce-mode";
import { createCreatorMarketplaceCheckout } from "../_core/stripe-checkout-service";
import { isStripeConnectReady } from "../_core/stripe-connect-service";
import { getContentCreatorProfile } from "../_core/partner-program-service";
import { mapServiceErrorToTrpc } from "../_core/service-errors";

const clientPlatformSchema = z.enum(["web", "native"]);
const packIdSchema = z.enum(["tip_1", "tip_2", "tip_4", "tip_10", "tip_20", "tip_25"]);

export const creatorTipsRouter = router({
  catalog: secureProcedure("commerce").query(() => getCreatorTipsCatalog()),

  send: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        creatorUserId: z.string().trim().min(1).max(80),
        packId: packIdSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
        billingStateCode: z.string().trim().length(2).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pack = getCreatorTipPack(input.packId);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown tip amount." });
      }
      const creator = getContentCreatorProfile(input.creatorUserId);
      if (!creator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tips go to enrolled content creators.",
        });
      }
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `creatortip.${input.packId}`,
        amountCents: pack.priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });

      if (!isSimulatedCommerceMode()) {
        if (getCommerceMode() !== "live") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
          });
        }
        const billingStateCode = input.billingStateCode?.trim().toUpperCase();
        if (!billingStateCode || billingStateCode.length !== 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Select your billing state so tax and the card fee go on your card.",
          });
        }
        if (!isStripeConnectReady(input.creatorUserId)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This creator has not connected a Stripe bank account yet.",
          });
        }
        try {
          const checkout = await createCreatorMarketplaceCheckout({
            buyerUserId: String(ctx.user.id),
            buyerEmail: ctx.user.email ?? "",
            creatorUserId: input.creatorUserId,
            kind: "tip",
            subtotalCents: pack.priceCents,
            billingStateCode,
            productName: `Tip for ${creator.displayName} (${pack.label})`,
            successPath: "/messages?tip=paid",
            cancelPath: "/messages?tip=cancel",
            extraMetadata: { packId: input.packId },
          });
          return {
            creatorGetsCents: checkout.split.creatorCents,
            chargeCents: checkout.totalCents,
            feeCents: checkout.totalCents - pack.priceCents - checkout.split.remittableTaxCents,
            notice: `They keep 100% of the ${pack.label} tip. Finish paying in Stripe. You pay tax and the card fee.`,
            checkoutUrl: checkout.checkoutUrl,
            sessionId: checkout.sessionId,
            mode: "checkout" as const,
          };
        } catch (error) {
          mapServiceErrorToTrpc(error);
        }
      }

      assertSimulatedPurchaseAllowed();
      const result = sendCreatorTip({
        fromUserId: String(ctx.user.id),
        fromEmail: ctx.user.email ?? "",
        fromName: ctx.user.name ?? undefined,
        creatorUserId: input.creatorUserId,
        packId: input.packId,
        billingStateCode: input.billingStateCode,
      });
      return {
        ...result,
        notice: `${result.notice} Simulated in development until live Stripe checkout is on.`,
        mode: "simulated" as const,
      };
    }),
});
