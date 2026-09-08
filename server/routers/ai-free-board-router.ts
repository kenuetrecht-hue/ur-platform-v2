import { z } from "zod";
import { ownerProcedure, router, secureProcedure, securePublicProcedure } from "../_core/trpc";
import { assertUserIsAgeVerified } from "../_core/age-kyc-service";
import {
  ensureAiFreeBoardSeeded,
  listAiFreeBoard,
  publishNextAiFreeBoardPost,
  shareAiFreeBoardPost,
  toggleAiFreeBoardLike,
} from "../_core/ai-free-board-service";
import { AI_FREE_BOARD_LANES } from "../../lib/ai-free-board-policy";

const laneSchema = z.enum(AI_FREE_BOARD_LANES);

export const aiFreeBoardRouter = router({
  list: securePublicProcedure("social")
    .input(
      z
        .object({
          lane: laneSchema.optional(),
          limit: z.number().int().min(4).max(60).optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      listAiFreeBoard({
        lane: input?.lane,
        limit: input?.limit,
        viewerUserId: ctx.user?.id != null ? String(ctx.user.id) : undefined,
      }),
    ),

  like: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      return toggleAiFreeBoardLike({ postId: input.postId, userId: String(ctx.user.id) });
    }),

  share: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      return shareAiFreeBoardPost(input.postId);
    }),

  publishNext: ownerProcedure
    .input(z.object({ lane: laneSchema.optional() }).optional())
    .mutation(({ input }) => {
      ensureAiFreeBoardSeeded();
      return publishNextAiFreeBoardPost(input?.lane);
    }),
});
