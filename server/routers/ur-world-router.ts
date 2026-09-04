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
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";
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
import { chipInLookFund, getLookFundBoard } from "../_core/ur-world-look-fund-service";
import { getLookFundChipPack, UR_WORLD_LOOK_FUND_SHORT } from "../../lib/ur-world-look-fund";

const clientPlatformSchema = z.enum(["web", "native"]);
const packIdSchema = z.enum(["wallet_10", "wallet_25", "wallet_50", "wallet_100"]);
const lookTipPackSchema = z.enum(["look_2", "look_10", "look_25", "look_50", "look_100"]);

const lockerWearIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(
    /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|owner-[a-z0-9-]+)$/,
    "Invalid locker item",
  );

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
    lookFund: UR_WORLD_LOOK_FUND_SHORT,
  })),

  snapshot: secureProcedure("commerce").query(({ ctx }) => {
    assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
    return getUrWorldSnapshot(String(ctx.user.id), ctx.user.name ?? ctx.user.email ?? undefined, ctx.isPlatformOwner);
  }),

  topUpWallet: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        packId: packIdSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
        billingStateCode: z.string().trim().length(2).optional(),
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
      const checkout = calculateCustomerCheckout(pack.priceCents, input.billingStateCode);
      return {
        ...creditCityWallet({
          userId: String(ctx.user.id),
          userEmail: ctx.user.email ?? "",
          packId: input.packId,
        }),
        checkout,
        notice:
          "Simulated City Wallet credit in development. You pay sales tax and the Stripe card fee. Credit is closed-loop entertainment value — not withdrawable cash.",
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
        billingStateCode: z.string().trim().length(2).optional(),
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
      const checkout = calculateCustomerCheckout(priceCents, input.billingStateCode);
      const instance = purchaseCosmeticPack({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        packId: input.packId,
        displayName: ctx.user.name ?? undefined,
      });
      return {
        instance,
        checkout,
        notice:
          "Simulated apparel purchase in development. You pay sales tax and the Stripe card fee. Locker license — not cotton, not an investment. Twenty percent of the pack price is a plaza look tip.",
      };
    }),

  wearApparel: secureProcedure("commerce")
    .input(z.object({ instanceId: lockerWearIdSchema }))
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

  lookFund: secureProcedure("commerce").query(({ ctx }) => {
    assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
    return getLookFundBoard(String(ctx.user.id));
  }),

  leaveLookTip: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        packId: lookTipPackSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
        billingStateCode: z.string().trim().length(2).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("ur_world", ctx.isPlatformOwner);
      requireWorldAccess(ctx);
      const pack = getLookFundChipPack(input.packId);
      if (!pack) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown look-fund tip." });
      }
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });
      assertSimulatedPurchaseAllowed();
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `looktip.${input.packId}`,
        amountCents: pack.priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
      });
      const checkout = calculateCustomerCheckout(pack.priceCents, input.billingStateCode);
      const result = chipInLookFund({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        displayName: ctx.user.name ?? undefined,
        packId: input.packId,
      });
      const badgeName = result.board.me?.status?.name ?? "Plaza Spark";
      return {
        ...result,
        checkout,
        notice:
          `Simulated tip in development. You pay sales tax and the Stripe card fee. You’re a ${badgeName}. Share that sticker on socials — tipper, not a donor.`,
      };
    }),
});
