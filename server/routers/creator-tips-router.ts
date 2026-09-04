import { z } from "zod";
import { router, secureProcedure, secureCheckoutProcedure, TRPCError } from "../_core/trpc";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import { getCreatorTipPack } from "../../lib/creator-tips";
import { getCreatorTipsCatalog, sendCreatorTip } from "../_core/creator-tips-service";

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
    .mutation(({ ctx, input }) => {
      const pack = getCreatorTipPack(input.packId);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown tip amount." });
      }
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });
      assertSimulatedPurchaseAllowed();
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `creatortip.${input.packId}`,
        amountCents: pack.priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });
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
      };
    }),
});
