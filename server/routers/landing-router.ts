import { z } from "zod";
import { securePublicProcedure, router, TRPCError } from "../_core/trpc";
import {
  getLandingPublicStats,
  getLandingTownHallPreview,
  isLandingDemoCreator,
  LANDING_DEMO_CREATOR_IDS,
  runLandingDemoChat,
  canUseDemoVoice,
  markDemoVoiceUsed,
  hasUsedDemo,
} from "../_core/landing-demo-service";
import { ElevenLabsVoiceService, AI_PERSONA_VOICES } from "../elevenlabs-integration";
import { sanitizeUserText } from "../_core/input-sanitize";
import { assertNoAiTakeoverInMessage } from "../_core/ai-control";
import { purchaseLandingPlatformPass } from "../_core/landing-checkout-service";
import { assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { redeemHandoffToken } from "../_core/app-handoff-service";
import {
  getLandingPlatformPassPriceDisplay,
  LANDING_ALL_SPECIALISTS_MONTHLY_CENTS,
  LANDING_SPECIALIST_COUNT_LABEL,
} from "../../lib/landing-checkout-pricing";

const demoCreatorSchema = z
  .string()
  .trim()
  .refine(isLandingDemoCreator, { message: "Specialist not available for demo." });

const DEMO_VOICE_PERSONA: Partial<Record<string, keyof typeof AI_PERSONA_VOICES>> = {
  "ai-marina-mechanic-001": "PLUMBING_FOREMAN",
  contentmate: "GAME_FORGE",
  linguamate: "TECH_BUILDER",
  "ai-wellness-001": "COMPLIANCE_DOCTOR",
  "ai-3d-specialist": "TECH_BUILDER",
};

export const landingRouter = router({
  getDemoSpecialists: securePublicProcedure("landing").query(() => ({
    specialists: LANDING_DEMO_CREATOR_IDS.map((id) => id),
  })),

  getPublicStats: securePublicProcedure("landing").query(() => getLandingPublicStats()),

  getTownHallPreview: securePublicProcedure("landing").query(() => getLandingTownHallPreview()),

  getDemoStatus: securePublicProcedure("landing").query(({ ctx }) => ({
    demoUsed: hasUsedDemo(ctx.ip),
  })),

  sendDemoMessage: securePublicProcedure("landing")
    .input(
      z.object({
        creatorId: demoCreatorSchema,
        message: z.string().trim().min(4).max(280),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const message = sanitizeUserText(input.message, 280);
      assertNoAiTakeoverInMessage(message, false);
      return runLandingDemoChat({
        creatorId: input.creatorId,
        message,
        ip: ctx.ip,
      });
    }),

  synthesizeDemoVoice: securePublicProcedure("landing")
    .input(
      z.object({
        creatorId: demoCreatorSchema,
        text: z.string().trim().min(1).max(400),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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

      const voiceConfig = AI_PERSONA_VOICES[personaKey];
      const service = new ElevenLabsVoiceService(apiKey);
      const response = await service.synthesizeVoice({
        text: input.text.slice(0, 400),
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
    pricingReady: LANDING_ALL_SPECIALISTS_MONTHLY_CENTS != null,
  })),

  purchasePlatformPass: securePublicProcedure("landing")
    .input(
      z.object({
        email: z.string().trim().email().max(120),
      }),
    )
    .mutation(({ input, ctx }) => {
      assertSimulatedPurchaseAllowed();
      const email = sanitizeUserText(input.email, 120);
      if (!email.includes("@")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid email address." });
      }

      return purchaseLandingPlatformPass({
        email,
        ip: ctx.ip,
        userId: ctx.user?.id != null ? String(ctx.user.id) : undefined,
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
