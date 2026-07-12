import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { initializeAIOmniEngine } from "./ai-omni-engine";
import { aiLearningSystem, SubmitLearningEventSchema } from "./ai-learning-system";
import { voicePropertyRouter } from "./voice-property-router";
import { ai3dSpecialistRouter } from "./ai-3d-specialist-router";
import { webSearchRouter } from "./web-search-router";
import { aiRealEstateRouter } from "./ai-real-estate-router";
import { stampsPersistenceRouter } from "./routers/stamps-persistence";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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

    submitLearning: protectedProcedure
      .input(SubmitLearningEventSchema)
      .mutation(async ({ input }) => {
        const result = await aiLearningSystem.submitLearningEvent(
          input.aiType,
          input.eventType,
          input.content,
          {
            confidence: input.confidence,
            tags: input.tags,
            requiresApproval: input.requiresApproval,
          }
        );
        return result;
      }),

    approveLearning: protectedProcedure
      .input(z.object({ eventId: z.string(), approvedBy: z.string() }))
      .mutation(async ({ input }) => {
        return await aiLearningSystem.approveLearningEvent(input.eventId, input.approvedBy);
      }),

    rejectLearning: protectedProcedure
      .input(z.object({ eventId: z.string(), reason: z.string(), rejectedBy: z.string() }))
      .mutation(async ({ input }) => {
        return await aiLearningSystem.rejectLearningEvent(input.eventId, input.reason, input.rejectedBy);
      }),

    getPendingApprovals: protectedProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]).optional() }))
      .query(({ input }) => {
        return aiLearningSystem.getPendingApprovals(input.aiType);
      }),

    getLearningEvents: protectedProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]), limit: z.number().optional() }))
      .query(({ input }) => {
        return aiLearningSystem.getLearningEvents(input.aiType, input.limit);
      }),

    getAuditLog: protectedProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]).optional(), limit: z.number().optional() }))
      .query(({ input }) => {
        return aiLearningSystem.getAuditLog(input.aiType, input.limit);
      }),

    getStatistics: protectedProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]).optional() }))
      .query(({ input }) => {
        return aiLearningSystem.getStatistics(input.aiType);
      }),

    getRateLimitStatus: protectedProcedure
      .input(z.object({ aiType: z.enum(["platform", "creator", "helper", "admin", "doctor"]) }))
      .query(({ input }) => {
        return aiLearningSystem.getRateLimitStatus(input.aiType);
      }),
  }),

  voiceProperty: voicePropertyRouter,
  ai3dSpecialist: ai3dSpecialistRouter,
  aiRealEstate: aiRealEstateRouter,
  webSearch: webSearchRouter,

  stamps: stampsPersistenceRouter,
  loyalty: router({
    awardDailySignIn: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const result = await db.awardDailySignInPoints(input.userId);
        const loyaltyRecord = await db.getLoyaltyPoints(input.userId);
        return {
          pointsAwarded: result.alreadyEarnedToday ? 0 : 200,
          ticketId: result.ticketId,
          alreadyEarnedToday: result.alreadyEarnedToday,
          totalPoints: loyaltyRecord?.totalPoints || 0,
          totalSignIns: loyaltyRecord?.totalSignIns || 0,
        };
      }),

    revealTicket: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input }) => {
        const ticket = await db.revealScratchOffTicket(input.ticketId);
        return {
          prizeType: ticket.prizeType,
          loyaltyPointsReward: ticket.loyaltyPointsReward,
          drawingEntryCount: ticket.drawingEntryCount,
        };
      }),

    claimPrize: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input }) => {
        await db.claimScratchOffPrize(input.ticketId);
        return { success: true };
      }),

    getSummary: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const loyaltyRecord = await db.getLoyaltyPoints(input.userId);
        return {
          totalPoints: loyaltyRecord?.totalPoints || 0,
          totalSignIns: loyaltyRecord?.totalSignIns || 0,
          totalPointsEarned: loyaltyRecord?.totalPointsEarned || 0,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
