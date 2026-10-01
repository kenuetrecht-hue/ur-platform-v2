import { z } from "zod";
import { ownerProcedure, router, securePublicProcedure } from "../_core/trpc";
import { getVisitorTrailReport, recordVisitorTrailEvent } from "../_core/visitor-trail-service";

const recordInput = z.object({
  visitorId: z.string().uuid(),
  kind: z.enum(["page", "button", "dwell"]),
  path: z.string().trim().min(1).max(300),
  label: z.string().trim().max(120).optional(),
  seconds: z.number().int().min(0).max(7200).optional(),
});

export const visitorTrailRouter = router({
  /** Unsigned visitors can leave a page/button mark. The reply is only ok. */
  record: securePublicProcedure("system")
    .input(recordInput)
    .mutation(async ({ input, ctx }) => {
      if (ctx.isPlatformOwner) return { ok: true as const };
      await recordVisitorTrailEvent({
        visitorId: input.visitorId,
        kind: input.kind,
        path: input.path,
        label: input.label,
        seconds: input.seconds,
        signedIn: Boolean(ctx.user),
      });
      return { ok: true as const };
    }),

  /** Owner only. Who arrived, where they stopped, and whether they signed up. */
  report: ownerProcedure.query(async () => getVisitorTrailReport(new Date())),
});
