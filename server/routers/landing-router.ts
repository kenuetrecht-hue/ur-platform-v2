import { z } from "zod";
import { securePublicProcedure, secureProcedure, secureCheckoutProcedure, ownerProcedure, router, TRPCError } from "../_core/trpc";
import {
  getLandingPublicStats,
  getLandingTownHallPreview,
  isLandingDemoCreator,
  LANDING_DEMO_CREATOR_IDS,
  LANDING_DEMO_MESSAGE_MAX,
  LANDING_DEMO_REPLY_MAX,
  LANDING_DEMO_VOICE_TEXT_MAX,
  runLandingDemoChat,
  canUseDemoVoice,
  markDemoVoiceUsed,
  hasUsedDemo,
} from "../_core/landing-demo-service";
import {
  assertLandingDemoSendAllowed,
  issueLandingDemoToken,
} from "../_core/landing-demo-guard";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import { ElevenLabsVoiceService, AI_PERSONA_VOICES } from "../elevenlabs-integration";
import { sanitizeUserText } from "../_core/input-sanitize";
import { assertNoAiTakeoverInMessage } from "../_core/ai-control";
import { purchaseLandingPlatformPass } from "../_core/landing-checkout-service";
import { assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { assertUserIsAgeVerified } from "../_core/age-kyc-service";
import { AGE_KYC_REQUIRED_MESSAGE } from "../../lib/age-kyc-policy";
import { assertTurnstileToken, getTurnstileClientConfig } from "../_core/turnstile";
import { TURNSTILE_TOKEN_MAX_LENGTH } from "../../lib/turnstile";
import { redeemHandoffToken } from "../_core/app-handoff-service";
import {
  getLandingPlatformPassPriceDisplay,
  LANDING_ALL_SPECIALISTS_MONTHLY_CENTS,
  LANDING_SPECIALIST_COUNT_LABEL,
} from "../../lib/landing-checkout-pricing";
import { truncateLandingDemoReply } from "../../lib/landing-demo-policy";
import {
  getLandingDemoConversionStats,
  recordLandingDemoConversion,
  recordLandingDemoSignupClick,
} from "../_core/landing-demo-attribution-service";

const demoCreatorSchema = z
  .string()
  .trim()
  .refine(isLandingDemoCreator, { message: "Specialist not available for demo." });

const DEMO_VOICE_PERSONA: Partial<Record<string, keyof typeof AI_PERSONA_VOICES>> = {
  "ai-coder-001": "TECH_BUILDER",
  "ai-marina-mechanic-001": "PLUMBING_FOREMAN",
  contentmate: "GAME_FORGE",
  linguamate: "LINGUA",
  "ai-wellness-001": "COMPLIANCE_DOCTOR",
  "ai-3d-specialist": "TECH_BUILDER",
  "ai-culinary-001": "TECH_BUILDER",
};

function assertLandingDemoSection(isPlatformOwner: boolean): void {
  assertSectionEnabledForRequest("landing_demo", isPlatformOwner);
}

export const landingRouter = router({
  getDemoSpecialists: securePublicProcedure("landing").query(({ ctx }) => {
    assertLandingDemoSection(ctx.isPlatformOwner);
    return {
      specialists: LANDING_DEMO_CREATOR_IDS.map((id) => id),
    };
  }),

  getPublicStats: securePublicProcedure("landing").query(() => getLandingPublicStats()),

  getTownHallPreview: securePublicProcedure("landing").query(() => getLandingTownHallPreview()),

  getDemoStatus: securePublicProcedure("landing").query(({ ctx }) => {
    assertLandingDemoSection(ctx.isPlatformOwner);
    const demoUsed = hasUsedDemo(ctx.ip);
    return {
      demoUsed,
      voiceUsed: !canUseDemoVoice(ctx.ip),
      demoToken: demoUsed ? null : issueLandingDemoToken(ctx.ip),
      turnstile: getTurnstileClientConfig(),
      limits: {
        messageMax: LANDING_DEMO_MESSAGE_MAX,
        replyMax: LANDING_DEMO_REPLY_MAX,
        voiceTextMax: LANDING_DEMO_VOICE_TEXT_MAX,
      },
    };
  }),

  sendDemoMessage: securePublicProcedure("landing")
    .input(
      z.object({
        creatorId: demoCreatorSchema,
        message: z.string().trim().min(4).max(LANDING_DEMO_MESSAGE_MAX),
        demoToken: z.string().trim().min(32).max(128),
        pageLoadedAtMs: z.number().finite(),
        honeypot: z.string().max(200).optional(),
        platform: z.enum(["web", "ios", "android", "unknown"]).optional(),
        turnstileToken: z.string().trim().max(TURNSTILE_TOKEN_MAX_LENGTH).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      assertLandingDemoSection(ctx.isPlatformOwner);
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: AGE_KYC_REQUIRED_MESSAGE,
        });
      }
      await assertUserIsAgeVerified(ctx.user.id);
      await assertTurnstileToken({
        token: input.turnstileToken,
        action: "landing_demo",
        ip: ctx.ip,
      });

      const message = sanitizeUserText(input.message, LANDING_DEMO_MESSAGE_MAX);
      assertNoAiTakeoverInMessage(message, false);

      assertLandingDemoSendAllowed({
        ip: ctx.ip,
        userAgent: ctx.req?.headers["user-agent"] as string | undefined,
        honeypot: input.honeypot,
        demoToken: input.demoToken,
        pageLoadedAtMs: input.pageLoadedAtMs,
        message,
      });

      return runLandingDemoChat({
        creatorId: input.creatorId,
        message,
        ip: ctx.ip,
        platform: input.platform ?? "unknown",
      });
    }),

  recordDemoSignupClick: securePublicProcedure("landing")
    .input(
      z.object({
        attributionId: z.string().trim().min(8).max(64),
      }),
    )
    .mutation(({ input }) => {
      const record = recordLandingDemoSignupClick(input.attributionId);
      return { ok: true as const, attributionId: record.id };
    }),

  recordDemoConversion: secureProcedure("landing")
    .input(
      z.object({
        attributionId: z.string().trim().min(8).max(64),
      }),
    )
    .mutation(({ input, ctx }) => {
      const record = recordLandingDemoConversion({
        attributionId: input.attributionId,
        userId: String(ctx.user.id),
      });
      return {
        ok: true as const,
        attributionId: record.id,
        creatorId: record.creatorId,
        convertedAt: record.convertedAt,
      };
    }),

  ownerDemoConversionStats: ownerProcedure.query(() => getLandingDemoConversionStats()),

  synthesizeDemoVoice: securePublicProcedure("landing")
    .input(
      z.object({
        creatorId: demoCreatorSchema,
        text: z.string().trim().min(1).max(LANDING_DEMO_VOICE_TEXT_MAX),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      assertLandingDemoSection(ctx.isPlatformOwner);
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: AGE_KYC_REQUIRED_MESSAGE,
        });
      }
      await assertUserIsAgeVerified(ctx.user.id);

      if (!hasUsedDemo(ctx.ip)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Send your free text demo first, then unlock voice preview.",
        });
      }

      if (!canUseDemoVoice(ctx.ip)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Demo voice already played. Sign up for full voice access.",
        });
      }

      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return { success: false as const, error: "Voice preview unavailable." };
      }

      const personaKey = DEMO_VOICE_PERSONA[input.creatorId];
      if (!personaKey) {
        return { success: false as const, error: "Voice not configured for this specialist." };
      }

      const voiceText = truncateLandingDemoReply(
        sanitizeUserText(input.text, LANDING_DEMO_VOICE_TEXT_MAX),
        LANDING_DEMO_VOICE_TEXT_MAX,
      );

      const voiceConfig = AI_PERSONA_VOICES[personaKey];
      const service = new ElevenLabsVoiceService(apiKey);
      const response = await service.synthesizeVoice({
        text: voiceText,
        voiceId: voiceConfig.voiceId,
        stability: voiceConfig.stability,
        similarityBoost: voiceConfig.similarityBoost,
      });

      markDemoVoiceUsed(ctx.ip);
      return { success: true as const, audioBase64: response.audioBase64 };
    }),

  getPlatformPassPricing: securePublicProcedure("landing").query(() => ({
    priceCents: LANDING_ALL_SPECIALISTS_MONTHLY_CENTS,
    priceDisplay: getLandingPlatformPassPriceDisplay(),
    specialistCountLabel: LANDING_SPECIALIST_COUNT_LABEL,
    pricingReady: true,
    taxNote:
      "You pay sales tax for your billing state plus Stripe’s card fee. UR and content creators do not absorb those.",
  })),

  purchasePlatformPass: secureCheckoutProcedure("landing")
    .input(
      z.object({
        email: z.string().trim().email().max(120),
        billingStateCode: z.string().trim().length(2).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      assertSimulatedPurchaseAllowed();
      await assertUserIsAgeVerified(ctx.user.id);
      const email = sanitizeUserText(input.email, 120);
      if (!email.includes("@")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid email address." });
      }

      return purchaseLandingPlatformPass({
        email,
        ip: ctx.ip,
        userId: String(ctx.user.id),
        billingStateCode: input.billingStateCode,
      });
    }),

  redeemHandoff: securePublicProcedure("landing")
    .input(
      z.object({
        token: z.string().trim().min(16).max(64),
      }),
    )
    .query(({ input }) => redeemHandoffToken(input.token)),
});
