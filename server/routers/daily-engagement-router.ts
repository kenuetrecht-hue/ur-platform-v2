import { z } from "zod";
import { secureProcedure, securePublicProcedure, router } from "../_core/trpc";
import {
  buildDailyHub,
  recordUserActivity,
  getUserEngagement,
} from "../_core/daily-engagement-service";

export const dailyEngagementRouter = router({
  getHubPreview: securePublicProcedure("dailyEngagement").query(() => buildDailyHub(null)),

  getHub: secureProcedure("dailyEngagement").query(({ ctx }) =>
    buildDailyHub(String(ctx.user.id)),
  ),

  getStreak: secureProcedure("dailyEngagement").query(({ ctx }) =>
    getUserEngagement(String(ctx.user.id)),
  ),

  recordActivity: secureProcedure("dailyEngagement")
    .input(
      z.object({
        creatorId: z.string().max(64).optional(),
        activityType: z.enum(["chat", "learn", "challenge"]).default("chat"),
      }),
    )
    .mutation(({ ctx, input }) =>
      recordUserActivity({
        userId: String(ctx.user.id),
        creatorId: input.creatorId,
        activityType: input.activityType,
      }),
    ),
});
