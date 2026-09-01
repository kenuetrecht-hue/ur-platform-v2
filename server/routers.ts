import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, secureProcedure, securePublicProcedure, ownerProcedure, router } from "./_core/trpc";
import { assertOwnedResource } from "./_core/input-sanitize";
import { mapServiceErrorToTrpc } from "./_core/service-errors";
import * as db from "./db";
import { initializeAIOmniEngine } from "./ai-omni-engine";
import { aiLearningSystem, SubmitLearningEventSchema } from "./ai-learning-system";
import { voicePropertyRouter } from "./voice-property-router";
import { ai3dSpecialistRouter } from "./ai-3d-specialist-router";
import { webSearchRouter } from "./web-search-router";
import { aiRealEstateRouter } from "./ai-real-estate-router";
import { aiLanguageRouter } from "./ai-language-router";
import { stampsPersistenceRouter } from "./routers/stamps-persistence";
import { chatRouter } from "./routers/chat-router";
import { aiCreatorChatRouter } from "./routers/ai-creator-chat-router";
import { platformOpsRouter } from "./routers/platform-ops-router";
import { equipmentRouter } from "./routers/equipment-router";
import { aiLearningRouter } from "./routers/ai-learning-router";
import { dailyEngagementRouter } from "./routers/daily-engagement-router";
import { coderSandboxRouter } from "./routers/coder-sandbox-router";
import { gameDevSandboxRouter } from "./routers/game-dev-sandbox-router";
import { forgeAgentRouter } from "./routers/forge-agent-router";
import { aiLiveSessionRouter } from "./routers/ai-live-session-router";
import { partnerDashboardRouter } from "./routers/partner-dashboard-router";
import { socialRouter } from "./routers/social-router";
import { contentProtectionRouter } from "./routers/content-protection-router";
import { commerceRouter } from "./routers/commerce-router";
import { blueprintReaderRouter } from "./routers/blueprint-reader-router";
import { aiSubscriptionRouter } from "./routers/ai-subscription-router";
import { aiTalkRouter } from "./routers/ai-talk-router";
import { workspace3dRouter } from "./routers/workspace-3d-router";
import { loyaltyRouter } from "./routers/loyalty-router";
import { hiveTownHallRouter } from "./routers/hive-town-hall-router";
import { usageCreditsRouter } from "./routers/usage-credits-router";
import { landingRouter } from "./routers/landing-router";
import { jobsiteRouter } from "./routers/jobsite-router";
import { muxVideoRouter } from "./routers/mux-video-router";
import { ageKycRouter } from "./routers/age-kyc-router";
import { destroyAllSessionsForUser } from "./_core/forge-session-manager";
import { getAgeKycPublicStatus } from "./_core/age-kyc-service";
import { isSupabaseAuthReachable } from "./supabase-auth";
import { assertTurnstileToken, getTurnstileClientConfig } from "./_core/turnstile";
import { TURNSTILE_TOKEN_MAX_LENGTH } from "../lib/turnstile";
import { AUTH_HONEYPOT_FIELD_MAX } from "../lib/bot-abuse-policy";
import { assertAuthChallengeAllowed } from "./_core/bot-abuse-guard";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    turnstileConfig: publicProcedure.query(() => getTurnstileClientConfig()),
    connectivity: publicProcedure.query(async () => {
      const supabaseReachable = await isSupabaseAuthReachable();
      return {
        supabaseReachable,
        hint: supabaseReachable
          ? null
          : "Cannot reach the sign-in service. Create a Supabase project at supabase.com/dashboard and put the Project URL and anon key in .env, then restart pnpm dev:web.",
      };
    }),
    verifyTurnstile: securePublicProcedure("auth")
      .input(
        z.object({
          token: z.string().trim().max(TURNSTILE_TOKEN_MAX_LENGTH),
          action: z.enum(["login", "signup", "landing_demo", "age_kyc"]),
          email: z.string().trim().email().max(254).optional(),
          displayName: z.string().trim().max(80).optional(),
          honeypot: z.string().max(AUTH_HONEYPOT_FIELD_MAX).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const userAgent =
          typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : undefined;
        assertAuthChallengeAllowed({
          ip: ctx.ip,
          userAgent,
          action: input.action,
          email: input.email,
          displayName: input.displayName,
          honeypot: input.honeypot,
        });
        await assertTurnstileToken({
          token: input.token,
          action: input.action,
          ip: ctx.ip,
        });
        return { ok: true as const };
      }),
    me: publicProcedure.query(async (opts) => {
      const kyc =
        opts.ctx.user != null
          ? await getAgeKycPublicStatus(opts.ctx.user.id)
          : {
              required: true as const,
              minAge: 18,
              status: "none" as const,
              verified: false,
              rejectionReason: null,
            };
      return {
        user: opts.ctx.user,
        isPlatformOwner: opts.ctx.isPlatformOwner,
        hasFullPlatformAccess: opts.ctx.isPlatformOwner,
        hasFullAiAccess: opts.ctx.isPlatformOwner,
        ageKyc: kyc,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      if (ctx.user?.id != null) {
        void destroyAllSessionsForUser(String(ctx.user.id));
      }
      return {
        success: true,
      } as const;
    }),
  }),

  ai: router({
    getOmniCapabilities: publicProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]) }))
      .query(({ input }) => {
        const engine = initializeAIOmniEngine(input.aiType);
        return {
          capabilities: engine.capabilities,
          config: engine.config,
          audioConfig: engine.audioConfig,
        };
      }),

    submitLearning: ownerProcedure
      .input(SubmitLearningEventSchema)
      .mutation(async ({ input, ctx }) => {
        const result = await aiLearningSystem.submitLearningEvent(
          input.aiType,
          input.eventType,
          input.content,
          {
            confidence: input.confidence,
            tags: input.tags,
            requiresApproval: false,
            userId: String(ctx.user.id),
          },
        );
        return result;
      }),

    approveLearning: ownerProcedure
      .input(z.object({ eventId: z.string().max(128), approvedBy: z.string().max(128) }))
      .mutation(async ({ input, ctx }) => {
        return await aiLearningSystem.approveLearningEvent(
          input.eventId,
          String(ctx.user.id),
        );
      }),

    rejectLearning: ownerProcedure
      .input(
        z.object({
          eventId: z.string().max(128),
          reason: z.string().max(500),
          rejectedBy: z.string().max(128),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        return await aiLearningSystem.rejectLearningEvent(
          input.eventId,
          input.reason,
          String(ctx.user.id),
        );
      }),

    getPendingApprovals: ownerProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]).optional() }))
      .query(({ input }) => {
        return aiLearningSystem.getPendingApprovals(input.aiType);
      }),

    getLearningEvents: ownerProcedure
      .input(
        z.object({
          aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]),
          limit: z.number().min(1).max(100).optional(),
        }),
      )
      .query(({ input }) => {
        return aiLearningSystem.getLearningEvents(input.aiType, input.limit);
      }),

    getAuditLog: ownerProcedure
      .input(
        z.object({
          aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]).optional(),
          limit: z.number().min(1).max(100).optional(),
        }),
      )
      .query(({ input }) => {
        return aiLearningSystem.getAuditLog(input.aiType, input.limit);
      }),

    getStatistics: ownerProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]).optional() }))
      .query(({ input }) => {
        return aiLearningSystem.getStatistics(input.aiType);
      }),

    getRateLimitStatus: ownerProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]) }))
      .query(({ input }) => {
        return aiLearningSystem.getRateLimitStatus(input.aiType);
      }),
  }),

  voiceProperty: voicePropertyRouter,
  ai3dSpecialist: ai3dSpecialistRouter,
  aiRealEstate: aiRealEstateRouter,
  aiLanguage: aiLanguageRouter,
  webSearch: webSearchRouter,

  stamps: stampsPersistenceRouter,
  chat: chatRouter,
  aiCreators: aiCreatorChatRouter,
  hiveTownHall: hiveTownHallRouter,
  landing: landingRouter,
  platformOps: platformOpsRouter,
  equipment: equipmentRouter,
  aiLearning: aiLearningRouter,
  dailyEngagement: dailyEngagementRouter,
  coderSandbox: coderSandboxRouter,
  gameDevSandbox: gameDevSandboxRouter,
  forgeAgent: forgeAgentRouter,
  aiLiveSessions: aiLiveSessionRouter,
  partnerDashboard: partnerDashboardRouter,
  social: socialRouter,
  contentProtection: contentProtectionRouter,
  commerce: commerceRouter,
  blueprintReader: blueprintReaderRouter,
  aiSubscription: aiSubscriptionRouter,
  aiTalk: aiTalkRouter,
  workspace3d: workspace3dRouter,
  loyalty: loyaltyRouter,
  usageCredits: usageCreditsRouter,
  jobsite: jobsiteRouter,
  muxVideo: muxVideoRouter,
  ageKyc: ageKycRouter,
});

export type AppRouter = typeof appRouter;
