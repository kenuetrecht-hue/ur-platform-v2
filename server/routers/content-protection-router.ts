import { z } from "zod";
import { secureProcedure, ownerProcedure, router, TRPCError } from "../_core/trpc";
import { sanitizeUserText } from "../_core/input-sanitize";
import {
  getUserProtectionStatus,
  listOpenProtectionReports,
  ownerReviewReport,
  submitProtectionReport,
} from "../_core/creator-content-protection-service";

export const contentProtectionRouter = router({
  /** Creator sees strike count and publish eligibility. */
  myStatus: secureProcedure("system").query(({ ctx }) =>
    getUserProtectionStatus(String(ctx.user.id)),
  ),

  /** Report impersonation or stolen content (rate-limited via system namespace). */
  submitReport: secureProcedure("system")
    .input(
      z.object({
        reportType: z.enum(["impersonation", "content_theft", "unauthorized_repost"]),
        subjectUserId: z.string().min(1).max(128),
        description: z.string().min(12).max(1000).trim(),
        relatedAssetId: z.string().uuid().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      submitProtectionReport({
        reporterUserId: String(ctx.user.id),
        reportType: input.reportType,
        subjectUserId: sanitizeUserText(input.subjectUserId, 128),
        description: input.description,
        relatedAssetId: input.relatedAssetId,
      }),
    ),

  /** Platform owner — review abuse queue (DMCA / impersonation). */
  listOpenReports: ownerProcedure.query(() => listOpenProtectionReports()),

  reviewReport: ownerProcedure
    .input(
      z.object({
        reportId: z.string().uuid(),
        decision: z.enum(["confirmed", "dismissed"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
      }
      return ownerReviewReport({
        reportId: input.reportId,
        ownerUserId: String(ctx.user.id),
        decision: input.decision,
      });
    }),
});
