import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, secureProcedure, ownerProcedure, router } from "./_core/trpc";
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
import { commerceRouter } from "./routers/commerce-router";
import { blueprintReaderRouter } from "./routers/blueprint-reader-router";
import { aiSubscriptionRouter } from "./routers/ai-subscription-router";
import { aiTalkRouter } from "./routers/ai-talk-router";
import { loyaltyRouter } from "./routers/loyalty-router";
import { destroyAllSessionsForUser } from "./_core/forge-session-manager";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => ({
      user: opts.ctx.user,
      isPlatformOwner: opts.ctx.isPlatformOwner,
      hasFullPlatformAccess: opts.ctx.isPlatformOwner,
      hasFullAiAccess: opts.ctx.isPlatformOwner,
    })),
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
  commerce: commerceRouter,
  blueprintReader: blueprintReaderRouter,
  aiSubscription: aiSubscriptionRouter,
  aiTalk: aiTalkRouter,
  loyalty: loyaltyRouter,
});

export type AppRouter = typeof appRouter;
