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
  AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE,
  AI_TALK_METERING_DISCLOSURE,
  formatTalkTimeRemaining,
} from "../../lib/ai-talk-time-policy";
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
  getAiTalkPack,
  formatTalkPrice,
  type AiTalkPackId,
} from "../../lib/ai-talk-pricing";
import { buildTalkPurchaseSummary, formatPurchaseReceiptMessage } from "../../lib/pricing-disclosures";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed, paymentChannelNote } from "../_core/payment-channel-guard";
import {
  AI_TALK_PRICING_SUMMARY,
  PAYMENT_CHANNEL_POLICY_SUMMARY,
} from "../../lib/payment-channel-policy";

const packIdSchema = z.enum(["talk_1", "talk_5"]);
const clientPlatformSchema = z.enum(["web", "native"]);

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
      pricingNote: AI_TALK_PRICING_SUMMARY,
      paymentNote: PAYMENT_CHANNEL_POLICY_SUMMARY,
      expiryDisclosure: AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
      meteringDisclosure: AI_TALK_METERING_DISCLOSURE,
      voiceMeteringDisclosure: AI_VOICE_METERING_DISCLOSURE,
      textMeteringDisclosure: AI_TEXT_METERING_DISCLOSURE,
      resumeDisclosure: AI_METERING_RESUME_DISCLOSURE,
      paybackProtection: AI_METERING_PAYBACK_PROTECTION,
      fiveDollarDisclosure: AI_TALK_FIVE_DOLLAR_PACK_DISCLOSURE,
      bonusRule: "Every $1 = 5 talk minutes · $5 = 25 minutes (app only) · Use within 30 days",
    })),

  getStatus: secureProcedure("aiTalk").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    const status = getPremiumMediaStatus(userId);
    const talkTime = getTalkTimeStatus(userId);
    return {
      minutesRemaining: status.talkMinutesRemaining,
      millisecondsRemaining: talkTime.millisecondsRemaining,
      millisecondsUsed: talkTime.millisecondsUsed,
      timeRemainingDisplay: formatTalkTimeRemaining(talkTime.millisecondsRemaining),
      earliestExpiryAt: talkTime.earliestExpiryAt,
      activeLots: talkTime.lots,
      openMeterSession: getOpenMeterSession(userId),
      hasTalkAccess: ctx.isPlatformOwner || talkTime.millisecondsRemaining > 0,
      activeEntitlement: status.aiTalk,
      expiryDisclosure: AI_TALK_EXPIRY_PURCHASE_DISCLOSURE,
    };
  }),

  purchase: secureProcedure("aiTalk")
    .input(
      z.object({
        packId: packIdSchema.default("talk_5"),
        stateCode: billingStateSchema,
        clientPlatform: clientPlatformSchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      if (ctx.isPlatformOwner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform owner has unlimited talk access.",
        });
      }

      assertSimulatedPurchaseAllowed();

      const pack = getAiTalkPack(input.packId as AiTalkPackId);
      assertPaymentChannelAllowed({
        subtotalCents: pack.priceCents,
        clientPlatform: input.clientPlatform,
      });

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
        millisecondsAdded: pack.totalMinutes * 60_000,
        minutesRemaining: getAiTalkMinutesRemaining(String(ctx.user.id)),
        millisecondsRemaining: getTalkTimeStatus(String(ctx.user.id)).millisecondsRemaining,
        expiresAt: entitlement.expiresAt,
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
    allowed: ctx.isPlatformOwner || hasAiTalkAccess(String(ctx.user.id)),
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
