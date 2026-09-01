import { z } from "zod";
import { router, secureProcedure, secureCheckoutProcedure, TRPCError } from "../_core/trpc";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { sanitizeUserText } from "../_core/input-sanitize";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import { requireWorldAccess } from "./conduct-router";
import { getUserByEmail } from "../db";
import {
  UR_WORLD_APPROVED_ADS,
  UR_WORLD_AD_ALLOWED,
  UR_WORLD_AD_FORBIDDEN,
  UR_WORLD_LEGAL_BANNER,
  UR_WORLD_PURPOSE,
  UR_WORLD_SHORT_FOOTER,
} from "../../lib/ur-world-disclosures";
import { UR_WORLD_COSMETIC_LICENSE } from "../../lib/ur-world-cosmetics";
import {
  UR_WORLD_REMODEL_CENTS,
  UR_WORLD_UPKEEP_CENTS,
  UR_WORLD_WALLET_PACKS,
  getWalletPack,
} from "../../lib/ur-world-economy";
import {
  creditCityWallet,
  getUrWorldSnapshot,
  hireSimulatedRemodel,
  licensePlot,
  payPlotUpkeep,
} from "../_core/ur-world-service";
import {
  equipCosmeticPack,
  giftCosmeticPack,
  giftUnusedTalkLot,
  listGiftableTalkLots,
  liveCosmeticPacks,
  livePackPriceCents,
  purchaseCosmeticPack,
} from "../_core/ur-world-locker-service";

const clientPlatformSchema = z.enum(["web", "native"]);
const packIdSchema = z.enum(["wallet_10", "wallet_25", "wallet_50", "wallet_100"]);

export const urWorldRouter = router({
  disclosures: secureProcedure("commerce").query(() => ({
    purpose: UR_WORLD_PURPOSE,
    banner: UR_WORLD_LEGAL_BANNER,
    footer: UR_WORLD_SHORT_FOOTER,
    allowedAds: [...UR_WORLD_AD_ALLOWED],
    forbiddenAds: [...UR_WORLD_AD_FORBIDDEN],
    approvedAds: UR_WORLD_APPROVED_ADS.map((a) => ({ ...a })),
    upkeepCents: UR_WORLD_UPKEEP_CENTS,
    remodelCents: UR_WORLD_REMODEL_CENTS,
    walletPacks: UR_WORLD_WALLET_PACKS.map((p) => ({ ...p })),
  })),

  snapshot: secureProcedure("commerce").query(({ ctx }) => {
    assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
    return getUrWorldSnapshot(String(ctx.user.id), ctx.user.name ?? ctx.user.email ?? undefined);
  }),

  topUpWallet: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        packId: packIdSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      const pack = getWalletPack(input.packId);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown City Wallet pack." });
      }
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });
      assertSimulatedPurchaseAllowed();
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `wallet.${input.packId}`,
        amountCents: pack.priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });
      return {
        ...creditCityWallet({
          userId: String(ctx.user.id),
          userEmail: ctx.user.email ?? "",
          packId: input.packId,
        }),
        notice:
          "Simulated City Wallet credit in development. Same Stripe account will fund this pack when live checkout is on. Credit is closed-loop entertainment value — not withdrawable cash.",
      };
    }),

  licensePlot: secureProcedure("commerce")
    .input(z.object({ plotId: z.string().trim().min(1).max(64) }))
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      const plot = licensePlot({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        plotId: input.plotId,
      });
      return { plot, footer: UR_WORLD_SHORT_FOOTER };
    }),

  payUpkeep: secureProcedure("commerce")
    .input(z.object({ plotId: z.string().trim().min(1).max(64) }))
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      return payPlotUpkeep({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        plotId: input.plotId,
      });
    }),

  hireRemodel: secureProcedure("commerce")
    .input(z.object({ plotId: z.string().trim().min(1).max(64) }))
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      return hireSimulatedRemodel({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        plotId: input.plotId,
      });
    }),

  catalog: secureProcedure("commerce").query(() => ({
    packs: liveCosmeticPacks(),
    license: UR_WORLD_COSMETIC_LICENSE,
    footer: UR_WORLD_SHORT_FOOTER,
  })),

  buyApparel: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        packId: z.string().trim().min(1).max(64),
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      const priceCents = livePackPriceCents(input.packId);
      assertPaymentChannelAllowed({
        subtotalCents: priceCents,
        clientPlatform: input.clientPlatform,
      });
      assertSimulatedPurchaseAllowed();
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `apparel.${input.packId}`,
        amountCents: priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });
      const instance = purchaseCosmeticPack({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        packId: input.packId,
      });
      return {
        instance,
        notice:
          "Simulated apparel purchase in development. Locker license — not cotton, not an investment. Gift it unused, or wear it.",
      };
    }),

  wearApparel: secureProcedure("commerce")
    .input(z.object({ instanceId: z.string().trim().uuid() }))
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      return {
        equipped: equipCosmeticPack({ userId: String(ctx.user.id), instanceId: input.instanceId }),
      };
    }),

  giftApparel: secureProcedure("commerce")
    .input(
      z.object({
        instanceId: z.string().trim().uuid(),
        toEmail: z.string().trim().email().max(254),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      await giftCosmeticPack({
        fromUserId: String(ctx.user.id),
        fromEmail: ctx.user.email ?? "",
        instanceId: input.instanceId,
        toEmail: sanitizeUserText(input.toEmail, 254),
      });
      return { notice: "Gift sent. They can wear it. They cannot resell it." };
    }),

  giftableTalk: secureProcedure("commerce").query(({ ctx }) => {
    assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
    return {
      lots: listGiftableTalkLots(String(ctx.user.id)).map((lot) => ({
        id: lot.id,
        packId: lot.packId,
        minutes: Math.round(lot.millisecondsIncluded / 60_000),
      })),
    };
  }),

  giftTalk: secureProcedure("commerce")
    .input(
      z.object({
        lotId: z.string().trim().min(1).max(80),
        toEmail: z.string().trim().email().max(254),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      const recipient = await getUserByEmail(sanitizeUserText(input.toEmail, 254));
      if (!recipient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "That person does not have a UR account yet. They need to join and pass 18+ KYC first.",
        });
      }
      giftUnusedTalkLot({
        fromUserId: String(ctx.user.id),
        lotId: input.lotId,
        toUserId: String(recipient.id),
      });
      return { notice: "Unused Talk pack gifted. 30 days starts for them now. No resale." };
    }),
});
