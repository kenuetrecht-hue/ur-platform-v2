import { z } from "zod";
import { router, secureProcedure, secureCheckoutProcedure, TRPCError } from "../_core/trpc";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { sanitizeUserText } from "../_core/input-sanitize";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import { getThanksStampPack } from "../../lib/ur-thanks-stamps";
import {
  getThanksStampWall,
  getThanksStampsCatalog,
  getThanksStampsWallet,
  giftThanksStamp,
  placeThanksStamp,
  placeThanksStampOnMemberByEmail,
  purchaseThanksStampPack,
} from "../_core/ur-thanks-stamps-service";

const clientPlatformSchema = z.enum(["web", "native"]);
const packIdSchema = z.enum(["thanks_1", "thanks_2", "thanks_4", "thanks_5", "thanks_10", "thanks_20", "thanks_25"]);

export const thanksStampsRouter = router({
  catalog: secureProcedure("stamps").query(() => getThanksStampsCatalog()),

  wallet: secureProcedure("stamps").query(({ ctx }) => getThanksStampsWallet(String(ctx.user.id))),

  wall: secureProcedure("stamps")
    .input(
      z.object({
        targetType: z.enum(["ai", "member"]),
        targetId: z.string().trim().min(1).max(80),
      }),
    )
    .query(({ input }) => getThanksStampWall(input.targetType, input.targetId)),

  buy: secureCheckoutProcedure("stamps")
    .input(
      z.object({
        packId: packIdSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
        billingStateCode: z.string().trim().length(2).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const pack = getThanksStampPack(input.packId);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown thanks-stamp pack." });
      }
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });
      assertSimulatedPurchaseAllowed();
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `thanks.${input.packId}`,
        amountCents: pack.priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });
      const result = purchaseThanksStampPack({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        packId: input.packId,
        billingStateCode: input.billingStateCode,
      });
      return {
        ...result,
        notice:
          "Simulated stamp pack in development. Social stickers — like emojis, not tips. You pay sales tax and the Stripe card fee. Gift unused once, or stick one on a post.",
      };
    }),

  gift: secureProcedure("stamps")
    .input(
      z.object({
        instanceId: z.string().trim().uuid(),
        toEmail: z.string().trim().email().max(254),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await giftThanksStamp({
        fromUserId: String(ctx.user.id),
        instanceId: input.instanceId,
        toEmail: sanitizeUserText(input.toEmail, 254),
      });
      return { notice: "Stamp gifted. They can place it. They cannot re-gift it." };
    }),

  place: secureProcedure("stamps")
    .input(
      z.object({
        instanceId: z.string().trim().uuid(),
        targetType: z.enum(["ai", "member"]),
        targetId: z.string().trim().min(1).max(80),
        note: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      placeThanksStamp({
        userId: String(ctx.user.id),
        displayName: ctx.user.name ?? undefined,
        instanceId: input.instanceId,
        targetType: input.targetType,
        targetId: input.targetId,
        note: input.note,
      });
      return { notice: "Stamp is on their page. Thank you — not cash, not a donation." };
    }),

  placeOnMember: secureProcedure("stamps")
    .input(
      z.object({
        instanceId: z.string().trim().uuid(),
        toEmail: z.string().trim().email().max(254),
        note: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await placeThanksStampOnMemberByEmail({
        userId: String(ctx.user.id),
        displayName: ctx.user.name ?? undefined,
        instanceId: input.instanceId,
        toEmail: sanitizeUserText(input.toEmail, 254),
        note: input.note,
      });
      return { notice: "Stamp is on their page. Thank you — not cash, not a donation. They do not get a payout." };
    }),
});
