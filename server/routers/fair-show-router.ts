import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ownerProcedure, router, secureProcedure } from "../_core/trpc";
import { FAIR_SHOW_CONTENT_KINDS, FAIR_SHOW_PLAIN_RULES, FAIR_SHOW_RULES } from "../../lib/fair-show";
import {
  getFairShowPage,
  getMyFairShowAnalytics,
  getOwnerFairShowBoard,
  resolveWatchTarget,
  syncFairShowCatalog,
} from "../_core/fair-show-service";
import { recordWatchHeartbeat } from "../_core/watch-analytics-service";
import { getContentCreatorProfile } from "../_core/partner-program-service";

export const fairShowRouter = router({
  rules: secureProcedure("video").query(() => ({
    rules: FAIR_SHOW_PLAIN_RULES,
    lanes: FAIR_SHOW_RULES,
  })),

  discover: secureProcedure("video")
    .input(
      z
        .object({
          limit: z.number().int().min(4).max(30).optional(),
          category: z.string().trim().max(64).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      getFairShowPage({
        viewerUserId: String(ctx.user.id),
        limit: input?.limit,
        category: input?.category,
      }),
    ),

  myAnalytics: secureProcedure("video").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    if (!getContentCreatorProfile(userId) && !ctx.isPlatformOwner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Enroll as a content creator to see watch analytics.",
      });
    }
    return getMyFairShowAnalytics(userId);
  }),

  ownerBoard: ownerProcedure.query(() => getOwnerFairShowBoard()),

  heartbeat: secureProcedure("video")
    .input(
      z.object({
        contentId: z.string().trim().min(8).max(80),
        kind: z.enum(FAIR_SHOW_CONTENT_KINDS),
        secondsWatched: z.number().min(0).max(20_000),
        durationSeconds: z.number().int().min(1).max(20_000).optional(),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      syncFairShowCatalog();
      const target = resolveWatchTarget(input.contentId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That video is not on Fair Show yet." });
      }
      if (target.kind !== input.kind) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video type does not match." });
      }
      return recordWatchHeartbeat({
        contentId: input.contentId,
        viewerUserId: String(ctx.user.id),
        secondsWatched: input.secondsWatched,
        durationSeconds: input.durationSeconds,
        completed: input.completed,
      });
    }),
});
