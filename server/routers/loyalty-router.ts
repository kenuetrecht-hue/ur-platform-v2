import { z } from "zod";
import { secureProcedure, ownerProcedure, router, TRPCError } from "../_core/trpc";
import { isCreatorAiId } from "../_core/ai-creator-registry";
import {
  getLoyaltyProgramSummary,
  isValidMilestoneDay,
  LOYALTY_MILESTONE_DAYS,
} from "../../lib/loyalty-program-config";
import {
  claimDailySignIn,
  claimStreakMilestoneReward,
  getLoyaltyAccount,
  getFreeTextMessagesRemaining,
  getLoyaltyDashboardForUser,
  hasClaimedToday,
} from "../_core/loyalty-streak-service";
import {
  fingerprintIp,
  getLoyaltyEvents,
  getLoyaltySignIns,
  getSecurityAuditForUser,
} from "../_core/loyalty-tracking-service";
import type { TrpcContext } from "../_core/context";

const creatorIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isCreatorAiId, { message: "Unknown AI assistant." });

const milestoneDaySchema = z
  .number()
  .int()
  .positive()
  .refine(isValidMilestoneDay, {
    message: `Milestone day must be one of: ${LOYALTY_MILESTONE_DAYS.join(", ")}`,
  });

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).max(10_000).default(0),
});

function buildAudit(ctx: TrpcContext) {
  return {
    requestId: ctx.requestId,
    ipFingerprint: fingerprintIp(ctx.ip),
  };
}

function assertNotOwner(ctx: TrpcContext) {
  if (ctx.isPlatformOwner) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Platform owner has full access — loyalty sign-in not required.",
    });
  }
}

export const loyaltyRouter = router({
  getProgram: secureProcedure("loyalty").query(() => getLoyaltyProgramSummary()),

  getStatus: secureProcedure("loyalty").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    const account = getLoyaltyAccount(userId);
    const program = getLoyaltyProgramSummary();
    const pendingMilestones = program.streakMilestones.filter(
      (m) =>
        account.currentStreakDays >= m.day && !account.milestonesClaimed.includes(m.day),
    );
    return {
      totalPoints: account.totalPoints,
      totalSignIns: account.totalSignIns,
      totalPointsEarned: account.totalPointsEarned,
      totalPointsSpent: account.totalPointsSpent,
      currentStreakDays: account.currentStreakDays,
      longestStreakDays: account.longestStreakDays,
      welcomeBonusClaimed: account.welcomeBonusClaimed,
      milestonesClaimed: account.milestonesClaimed,
      pendingMilestones,
      pointsPerTextMessage: program.pointsPerTextMessage,
      claimedToday: hasClaimedToday(userId),
    };
  }),

  getDashboard: secureProcedure("loyalty").query(({ ctx }) =>
    getLoyaltyDashboardForUser(String(ctx.user.id)),
  ),

  getActivity: secureProcedure("loyalty")
    .input(paginationSchema.optional())
    .query(({ ctx, input }) => {
      const userId = String(ctx.user.id);
      const limit = input?.limit ?? 30;
      const offset = input?.offset ?? 0;
      return getLoyaltyEvents(userId, limit, offset);
    }),

  getSignInHistory: secureProcedure("loyalty")
    .input(paginationSchema.optional())
    .query(({ ctx, input }) => {
      const userId = String(ctx.user.id);
      const limit = input?.limit ?? 30;
      const offset = input?.offset ?? 0;
      return getLoyaltySignIns(userId, limit, offset);
    }),

  claimDailySignIn: secureProcedure("loyalty").mutation(async ({ ctx }) => {
    assertNotOwner(ctx);
    return claimDailySignIn(String(ctx.user.id), buildAudit(ctx));
  }),

  claimMilestone: secureProcedure("loyalty")
    .input(
      z.object({
        creatorId: creatorIdSchema,
        milestoneDay: milestoneDaySchema,
      }),
    )
    .mutation(({ input, ctx }) => {
      assertNotOwner(ctx);
      const userId = String(ctx.user.id);
      const grant = claimStreakMilestoneReward({
        userId,
        creatorId: input.creatorId,
        milestoneDay: input.milestoneDay,
        audit: buildAudit(ctx),
      });
      return {
        ok: true as const,
        messagesGranted: grant.messagesGranted,
        creatorId: grant.creatorId,
        expiresAt: grant.expiresAt,
        messagesRemaining: getFreeTextMessagesRemaining(userId, input.creatorId),
      };
    }),

  getFreeMessages: secureProcedure("loyalty")
    .input(z.object({ creatorId: creatorIdSchema }))
    .query(({ input, ctx }) => ({
      messagesRemaining: getFreeTextMessagesRemaining(String(ctx.user.id), input.creatorId),
    })),

  /** Owner-only fraud / security audit — IP fingerprints never shown to members */
  ownerSecurityAudit: ownerProcedure
    .input(
      z.object({
        userId: z.string().trim().min(1).max(64),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(({ input }) => ({
      entries: getSecurityAuditForUser(input.userId, input.limit),
    })),
});
