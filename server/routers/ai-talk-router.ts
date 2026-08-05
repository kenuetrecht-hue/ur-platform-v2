import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import {
  getAiTalkMinutesRemaining,
  getPremiumMediaStatus,
  hasAiTalkAccess,
  purchaseAiTalkPack,
} from "../_core/ai-premium-media-service";
import {
  listAiTalkPacks,
  getAiTalkPack,
  formatTalkPrice,
  type AiTalkPackId,
} from "../../lib/ai-talk-pricing";
import { buildTalkPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";

const packIdSchema = z.enum(["quick_4", "standard_20"]);

export const aiTalkRouter = router({
  getPlans: securePublicProcedure("aiTalk")
    .input(z.object({ stateCode: optionalBillingStateSchema }).optional())
    .query(({ input }) => ({
      packs: listAiTalkPacks().map((pack) => ({
        ...pack,
        priceDisplay: formatTalkPrice(pack.priceCents),
        effectiveRateDisplay: formatTalkPrice(Math.round(pack.priceCents / pack.totalMinutes)),
        purchaseSummary: buildTalkPurchaseSummary(pack.id, input?.stateCode ?? null),
      })),
      bonusRule: "+1 bonus minute for every 4 minutes purchased",
    })),

  getStatus: secureProcedure("aiTalk").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    const status = getPremiumMediaStatus(userId);
    return {
      minutesRemaining: status.talkMinutesRemaining,
      hasTalkAccess: ctx.isPlatformOwner || status.talkMinutesRemaining > 0,
      activeEntitlement: status.aiTalk,
    };
  }),

  purchase: secureProcedure("aiTalk")
    .input(
      z.object({
        packId: packIdSchema.default("standard_20"),
        stateCode: billingStateSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner has unlimited talk access.",
        });
      }

      const pack = getAiTalkPack(input.packId as AiTalkPackId);
      const entitlement = purchaseAiTalkPack({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        packId: input.packId as AiTalkPackId,
        billingStateCode: input.stateCode,
      });

      const receipt = buildTalkPurchaseSummary(input.packId as AiTalkPackId, input.stateCode);

      return {
        ok: true as const,
        pack,
        minutesAdded: pack.totalMinutes,
        minutesRemaining: getAiTalkMinutesRemaining(String(ctx.user.id)),
        entitlement,
        receipt,
        message: formatPurchaseReceiptMessage(receipt),
      };
    }),

  checkAccess: secureProcedure("aiTalk").query(({ ctx }) => ({
    allowed: ctx.isPlatformOwner || hasAiTalkAccess(String(ctx.user.id)),
    minutesRemaining: ctx.isPlatformOwner ? 9999 : getAiTalkMinutesRemaining(String(ctx.user.id)),
  })),
});
