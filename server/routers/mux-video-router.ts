import { z } from "zod";
import { router, secureProcedure, securePublicProcedure } from "../_core/trpc";
import { MUX_VIDEO_PURPOSES } from "../../lib/mux-video-engine";
import { assertCanUploadClassVideo } from "../_core/class-replay-service";
import {
  createMuxDirectUpload,
  getMuxEnginePublicStatus,
  getMuxUpload,
  getMuxUploadForSession,
  publicMuxUpload,
} from "../_core/mux-video-engine";

function requestOrigin(req: { headers: Record<string, unknown> }): string | undefined {
  const origin = req.headers.origin;
  return typeof origin === "string" ? origin : undefined;
}

export const muxVideoRouter = router({
  status: securePublicProcedure("video").query(() => getMuxEnginePublicStatus()),

  createClassReplayUpload: secureProcedure("video")
    .input(
      z.object({
        sessionId: z.string().uuid(),
        purpose: z.enum(MUX_VIDEO_PURPOSES).default("class_replay"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanUploadClassVideo({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      });
      const upload = await createMuxDirectUpload({
        purpose: input.purpose === "ai_class" || input.purpose === "class_replay" ? input.purpose : "class_replay",
        ownerUserId: String(ctx.user.id),
        sessionId: input.sessionId,
        requestOrigin: requestOrigin(ctx.req),
      });
      return publicMuxUpload(upload);
    }),

  getUpload: secureProcedure("video")
    .input(z.object({ uploadId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const upload = getMuxUpload(input.uploadId);
      if (!upload) return null;
      if (upload.ownerUserId !== String(ctx.user.id) && !ctx.isPlatformOwner) {
        return null;
      }
      return publicMuxUpload(upload);
    }),

  uploadForSession: secureProcedure("video")
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      assertCanUploadClassVideo({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      });
      const upload = getMuxUploadForSession(input.sessionId);
      return upload ? publicMuxUpload(upload) : null;
    }),
});
