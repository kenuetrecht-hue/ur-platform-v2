import { z } from "zod";
import { secureProcedure, securePublicProcedure, router, TRPCError } from "../_core/trpc";
import {
  getAiTalkMinutesRemaining,
  getPremiumMediaStatus,
  hasAiTalkAccess,
  purchaseAiTalkPack,
  getTalkTimeStatus,
  getSpeechUsageLog,
} from "../_core/ai-premium-media-service";
import {
  getTalkPackPurchaseDisclosures,
  AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
  AI_TALK_EXPIRY_TRACKER_HEADLINE,
  AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE,
  AI_TALK_ONE_DOLLAR_PACK_DISCLOSURE,
  AI_TALK_BULK_500_PACK_DISCLOSURE,
  AI_TALK_BULK_1000_PACK_DISCLOSURE,
  AI_TALK_METERING_DISCLOSURE,
  AI_TALK_MAX_UNUSED_MINUTES,
  AI_TALK_STOCKPILE_DISCLOSURE,
  formatTalkExpiryDate,
  formatTalkLotLoseBy,
  formatTalkTimeRemaining,
  formatTalkTimeRemainingVerbose,
  getTalkLotExpiryDays,
  getTalkLowBalanceNotice,
  isTalkTimeLowBalance,
} from "../../lib/ai-talk-time-policy";
import {
  buildTalkPurchaseAgreement,
  serializePurchaseAgreement,
} from "../../lib/digital-purchase-agreements";
import {
  AI_METERING_PAYBACK_PROTECTION,
  AI_METERING_RESUME_DISCLOSURE,
  AI_TEXT_METERING_DISCLOSURE,
  AI_VOICE_METERING_DISCLOSURE,
  formatMeterMs,
} from "../../lib/ai-metering-policy";
import {
  finalizeMeterSession,
  getMeterSessionStatus,
  getOpenMeterSession,
  heartbeatMeterSession,
  pauseMeterSession,
  resumeMeterSession,
} from "../_core/ai-metering-session-service";
import {
  listAiTalkPacks,
  formatTalkPrice,
  AI_TALK_PACK_IDS,
  type AiTalkPackId,
} from "../../lib/ai-talk-pricing";
import { buildTalkPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import type { UsStateCode } from "../../lib/us-state-taxes";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed, paymentChannelNote } from "../_core/payment-channel-guard";
import { getCommerceMode, LIVE_CHECKOUT_UNAVAILABLE_NOTICE, isSimulatedCommerceMode } from "../../lib/dev-commerce-mode";
import { createTalkPackCheckoutSession } from "../_core/stripe-checkout-service";
import { mapServiceErrorToTrpc } from "../_core/service-errors";
import { PAYMENT_CHANNEL_POLICY_SUMMARY } from "../../lib/payment-channel-policy";
import { liveTalkPack } from "../_core/owner-price-catalog-service";
import { acceptedNoRefundSchema, assertAndRecordNoRefundAck } from "../_core/conduct-ledger-service";
import { requireWorldAccess } from "./conduct-router";

const packIdSchema = z.enum(AI_TALK_PACK_IDS);
const clientPlatformSchema = z.enum(["web", "native"]);

export const aiTalkRouter = router({
  getPlans: securePublicProcedure("aiTalk")
    .input(z.object({ stateCode: optionalBillingStateSchema }).optional())
    .query(async ({ input }) => ({
      packs: await Promise.all(
        listAiTalkPacks().map(async (pack) => {
          const live = await liveTalkPack(pack.id);
          return {
            ...live,
            priceDisplay: formatTalkPrice(live.priceCents),
            effectiveRateDisplay: formatTalkPrice(Math.round(live.priceCents / live.totalMinutes)),
            purchaseSummary: buildTalkPurchaseSummary(
              pack.id,
              (input?.stateCode ?? null) as UsStateCode | null,
              live.priceCents,
            ),
            agreement: buildTalkPurchaseAgreement(pack.id, live.priceCents),
            expiryDays: getTalkLotExpiryDays(pack.id),
          };
        }),
      ),
      pricingNote: "Amounts on each card are the current checkout prices.",
      paymentNote: PAYMENT_CHANNEL_POLICY_SUMMARY,
      expiryDisclosure: AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
      stockpileDisclosure: AI_TALK_STOCKPILE_DISCLOSURE,
      unusedMinutesCap: AI_TALK_MAX_UNUSED_MINUTES,
      meteringDisclosure: AI_TALK_METERING_DISCLOSURE,
      voiceMeteringDisclosure: AI_VOICE_METERING_DISCLOSURE,
      textMeteringDisclosure: AI_TEXT_METERING_DISCLOSURE,
      resumeDisclosure: AI_METERING_RESUME_DISCLOSURE,
      paybackProtection: AI_METERING_PAYBACK_PROTECTION,
      oneDollarDisclosure: AI_TALK_ONE_DOLLAR_PACK_DISCLOSURE,
      fiveDollarDisclosure: AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE,
      bulk500Disclosure: AI_TALK_BULK_500_PACK_DISCLOSURE,
      bulk1000Disclosure: AI_TALK_BULK_1000_PACK_DISCLOSURE,
      bonusRule:
        "Every $1 = 5 talk minutes (use in 30 days) · $5 = 20 minutes app only (use in 30 days) · $120 = 500 minutes web (use in 90 days) · $200 = 1,000 minutes web (use in 90 days) · Max 1,000 unused minutes at once",
    })),

  getStatus: secureProcedure("aiTalk").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    const status = getPremiumMediaStatus(userId);
    const talkTime = getTalkTimeStatus(userId);
    const ownerComplimentary = ctx.isPlatformOwner === true;
    return {
      ownerComplimentary,
      minutesRemaining: ownerComplimentary ? 9999 : status.talkMinutesRemaining,
      millisecondsRemaining: ownerComplimentary ? 86_400_000 : talkTime.millisecondsRemaining,
      millisecondsUsed: talkTime.millisecondsUsed,
      timeRemainingDisplay: ownerComplimentary ? "Included (owner)" : formatTalkTimeRemaining(talkTime.millisecondsRemaining),
      timeRemainingVerbose: ownerComplimentary
        ? "Platform owner talk is included on every specialist. You are not billed Talk packs."
        : formatTalkTimeRemainingVerbose(talkTime.millisecondsRemaining),
      earliestExpiryAt: ownerComplimentary ? null : talkTime.earliestExpiryAt,
      earliestExpiryDisplay: ownerComplimentary
        ? null
        : talkTime.earliestExpiryAt
          ? formatTalkExpiryDate(talkTime.earliestExpiryAt)
          : null,
      earliestLoseByLabel: ownerComplimentary
        ? null
        : talkTime.earliestExpiryAt
          ? formatTalkLotLoseBy(talkTime.earliestExpiryAt)
          : null,
      expiryHeadline: AI_TALK_EXPIRY_TRACKER_HEADLINE,
      lowBalance: ownerComplimentary ? false : isTalkTimeLowBalance(talkTime.millisecondsRemaining),
      lowBalanceNotice: ownerComplimentary ? null : getTalkLowBalanceNotice(talkTime.millisecondsRemaining),
      activeLots: ownerComplimentary ? [] : talkTime.lots,
      trackerLots: ownerComplimentary ? [] : talkTime.lots.map((lot) => lot.tracker),
      openMeterSession: getOpenMeterSession(userId),
      hasTalkAccess: ownerComplimentary || talkTime.millisecondsRemaining > 0,
      activeEntitlement: status.aiTalk,
      expiryDisclosure: AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
      stockpileDisclosure: AI_TALK_STOCKPILE_DISCLOSURE,
      unusedMinutesCap: AI_TALK_MAX_UNUSED_MINUTES,
    };
  }),

  purchase: secureProcedure("aiTalk")
    .input(
      z.object({
        packId: packIdSchema.default("talk_5"),
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
        acceptedNoRefund: acceptedNoRefundSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner has unlimited talk access.",
        });
      }

      requireWorldAccess(ctx);

      const pack = await liveTalkPack(input.packId as AiTalkPackId);
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });

      const agreement = buildTalkPurchaseAgreement(input.packId as AiTalkPackId, pack.priceCents);
      assertAndRecordNoRefundAck({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        sku: `talk.${input.packId}`,
        amountCents: pack.priceCents,
        acceptedNoRefund: true,
        ipAddress: ctx.ip,
        agreementVersion: agreement.version,
        agreementText: serializePurchaseAgreement(agreement),
      });

      if (!isSimulatedCommerceMode()) {
        if (getCommerceMode() !== "live") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
          });
        }
        try {
          const checkout = await createTalkPackCheckoutSession({
            userId: String(ctx.user.id),
            userEmail: ctx.user.email ?? "",
            packId: input.packId as AiTalkPackId,
            billingStateCode: input.stateCode,
          });
          return {
            ok: true as const,
            mode: "checkout" as const,
            checkoutUrl: checkout.checkoutUrl,
            sessionId: checkout.sessionId,
            pack,
            totalCents: checkout.totalCents,
            message: "Continue in the secure Stripe checkout window. Talk minutes are added after payment confirms.",
            paymentChannel: paymentChannelNote(pack.priceCents),
            purchaseDisclosures: getTalkPackPurchaseDisclosures(pack.id),
          };
        } catch (error) {
          mapServiceErrorToTrpc(error);
        }
      }

      assertSimulatedPurchaseAllowed();

      const entitlement = purchaseAiTalkPack({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        packId: input.packId as AiTalkPackId,
        billingStateCode: input.stateCode,
        priceCents: pack.priceCents,
      });

      const receipt = buildTalkPurchaseSummary(
        input.packId as AiTalkPackId,
        input.stateCode as UsStateCode,
        pack.priceCents,
      );
      const talkTime = getTalkTimeStatus(String(ctx.user.id));

      return {
        ok: true as const,
        mode: "simulated" as const,
        pack,
        minutesAdded: pack.totalMinutes,
        millisecondsAdded: pack.totalMinutes * 60_000,
        minutesRemaining: getAiTalkMinutesRemaining(String(ctx.user.id)),
        millisecondsRemaining: talkTime.millisecondsRemaining,
        timeRemainingDisplay: formatTalkTimeRemaining(talkTime.millisecondsRemaining),
        timeRemainingVerbose: formatTalkTimeRemainingVerbose(talkTime.millisecondsRemaining),
        expiresAt: entitlement.expiresAt,
        expiresAtDisplay: formatTalkExpiryDate(entitlement.expiresAt),
        useByWarning: formatTalkLotLoseBy(entitlement.expiresAt),
        expiryHeadline: AI_TALK_EXPIRY_TRACKER_HEADLINE,
        trackerLots: talkTime.lots.map((lot) => lot.tracker),
        entitlement,
        receipt,
        message: formatPurchaseReceiptMessage(receipt),
        paymentChannel: paymentChannelNote(pack.priceCents),
        purchaseDisclosures: getTalkPackPurchaseDisclosures(pack.id),
      };
    }),

  getUsageLog: secureProcedure("aiTalk")
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
    .query(({ ctx, input }) => ({
      sessions: getSpeechUsageLog(String(ctx.user.id), input?.limit ?? 25),
    })),

  checkAccess: secureProcedure("aiTalk").query(({ ctx }) => ({
    allowed: hasAiTalkAccess(String(ctx.user.id), ctx.isPlatformOwner),
    minutesRemaining: ctx.isPlatformOwner ? 9999 : getAiTalkMinutesRemaining(String(ctx.user.id)),
  })),

  meterHeartbeat: secureProcedure("aiTalk")
    .input(
      z.object({
        sessionId: z.string().min(4).max(64),
        playbackPositionMs: z.number().int().min(0).max(86_400_000),
        clientOnline: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const result = heartbeatMeterSession({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        playbackPositionMs: input.playbackPositionMs,
        clientOnline: input.clientOnline,
      });
      return {
        status: result.session.status,
        playbackPositionMs: result.session.playbackPositionMs,
        billableConnectedMs: result.session.billableConnectedMs,
        millisecondsRemaining: result.millisecondsRemaining,
        projectedRemainingMs: result.projectedRemainingMs,
        timeRemainingDisplay: formatTalkTimeRemaining(result.projectedRemainingMs),
        positionDisplay: formatMeterMs(result.session.playbackPositionMs),
      };
    }),

  meterPause: secureProcedure("aiTalk")
    .input(
      z.object({
        sessionId: z.string().min(4).max(64),
        playbackPositionMs: z.number().int().min(0).max(86_400_000),
        reason: z.enum(["disconnect", "user", "auto"]).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const session = pauseMeterSession({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        playbackPositionMs: input.playbackPositionMs,
        reason: input.reason,
      });
      const balance = getTalkTimeStatus(String(ctx.user.id)).millisecondsRemaining;
      return {
        status: session.status,
        playbackPositionMs: session.playbackPositionMs,
        millisecondsRemaining: balance,
        timeRemainingDisplay: formatTalkTimeRemaining(balance),
        positionDisplay: formatMeterMs(session.playbackPositionMs),
      };
    }),

  meterResume: secureProcedure("aiTalk")
    .input(
      z.object({
        sessionId: z.string().min(4).max(64),
        playbackPositionMs: z.number().int().min(0).max(86_400_000),
      }),
    )
    .mutation(({ ctx, input }) => {
      const session = resumeMeterSession({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        playbackPositionMs: input.playbackPositionMs,
      });
      const balance = getTalkTimeStatus(String(ctx.user.id)).millisecondsRemaining;
      return {
        status: session.status,
        playbackPositionMs: session.playbackPositionMs,
        millisecondsRemaining: balance,
        timeRemainingDisplay: formatTalkTimeRemaining(balance),
        positionDisplay: formatMeterMs(session.playbackPositionMs),
      };
    }),

  meterFinalize: secureProcedure("aiTalk")
    .input(
      z.object({
        sessionId: z.string().min(4).max(64),
        playbackPositionMs: z.number().int().min(0).max(86_400_000),
      }),
    )
    .mutation(({ ctx, input }) => {
      const result = finalizeMeterSession({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        playbackPositionMs: input.playbackPositionMs,
        reason: "playback_end",
      });
      return {
        billedMs: result.billedMs,
        speechUsageId: result.speechUsageId,
        millisecondsRemaining: result.millisecondsRemaining,
        timeRemainingDisplay: formatTalkTimeRemaining(result.millisecondsRemaining),
      };
    }),

  meterStatus: secureProcedure("aiTalk")
    .input(z.object({ sessionId: z.string().min(4).max(64) }))
    .query(({ ctx, input }) => {
      const result = getMeterSessionStatus({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
      });
      return {
        status: result.session.status,
        isPaused: result.isPaused,
        playbackPositionMs: result.session.playbackPositionMs,
        billableConnectedMs: result.session.billableConnectedMs,
        millisecondsRemaining: result.millisecondsRemaining,
        projectedRemainingMs: result.projectedRemainingMs,
        timeRemainingDisplay: formatTalkTimeRemaining(result.projectedRemainingMs),
        positionDisplay: formatMeterMs(result.session.playbackPositionMs),
      };
    }),
});
