import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ownerProcedure, router, secureProcedure } from "../_core/trpc";
import { assertUserIsAgeVerified } from "../_core/age-kyc-service";
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
import {
  assertFreeVideoShareAllowed,
  buildFreeVideoShareText,
  getVideoRating,
  getVideoRatingsByIds,
  rateVideo,
} from "../_core/video-rating-service";
import { CREATOR_FREE_CONTENT_INCOME_RULE_SHORT } from "../../lib/creator-free-content-policy";

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
    .query(({ ctx, input }) => {
      const page = getFairShowPage({
        viewerUserId: String(ctx.user.id),
        limit: input?.limit,
        category: input?.category,
      });
      const ratings = getVideoRatingsByIds(
        page.items.map((item) => item.contentId),
        String(ctx.user.id),
      );
      return {
        ...page,
        freeContentNote: CREATOR_FREE_CONTENT_INCOME_RULE_SHORT,
        items: page.items.map((item) => ({
          ...item,
          rating: ratings[item.contentId] ?? null,
          isFreeShareable: item.kind === "social_video" || item.kind === "cartoon",
        })),
      };
    }),

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

  getRating: secureProcedure("video")
    .input(z.object({ contentId: z.string().trim().min(8).max(80) }))
    .query(({ ctx, input }) => getVideoRating(input.contentId, String(ctx.user.id))),

  rateVideo: secureProcedure("video")
    .input(
      z.object({
        contentId: z.string().trim().min(8).max(80),
        kind: z.enum(FAIR_SHOW_CONTENT_KINDS),
        stars: z.number().int().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      syncFairShowCatalog();
      const target = resolveWatchTarget(input.contentId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That video is not on Fair Show yet." });
      }
      if (target.kind !== input.kind) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video type does not match." });
      }
      return rateVideo({
        contentId: input.contentId,
        kind: input.kind,
        userId: String(ctx.user.id),
        stars: input.stars,
      });
    }),

  shareFreeVideo: secureProcedure("video")
    .input(
      z.object({
        contentId: z.string().trim().min(8).max(80),
        kind: z.enum(FAIR_SHOW_CONTENT_KINDS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      syncFairShowCatalog();
      const target = resolveWatchTarget(input.contentId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "That video is not on Fair Show yet." });
      }
      if (target.kind !== input.kind) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Video type does not match." });
      }
      assertFreeVideoShareAllowed(input.kind);
      const href =
        target.kind === "cartoon"
          ? "/cartoon-studio"
          : target.kind === "social_video"
            ? "/(tabs)/messages"
            : `/${target.kind}/${target.contentId}`;
      return buildFreeVideoShareText({
        title: target.title,
        creatorName: getContentCreatorProfile(target.creatorId)?.displayName ?? "Creator",
        href,
        kind: input.kind,
      });
    }),
});
