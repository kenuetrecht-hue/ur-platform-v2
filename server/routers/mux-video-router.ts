import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, secureProcedure, securePublicProcedure } from "../_core/trpc";
import { MUX_VIDEO_PURPOSES } from "../../lib/mux-video-engine";
import { assertCanUploadClassVideo } from "../_core/class-replay-service";
import { getLiveSession, userHasSessionAccess } from "../_core/ai-live-session-service";
import {
  createMuxDirectUpload,
  createOrGetMuxLiveStream,
  getMuxEnginePublicStatus,
  getMuxUpload,
  getMuxUploadForSession,
  publicMuxLiveHost,
  publicMuxLiveViewer,
  publicMuxUpload,
  refreshMuxLiveForSession,
  signMuxPlayback,
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

  startClassLive: secureProcedure("video")
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = getLiveSession(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
      }
      if (session.status === "cancelled" || session.status === "ended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This class is closed. The live picture cannot be started.",
        });
      }
      const userId = String(ctx.user.id);
      const isHost = session.hostUserId === userId;
      if (!ctx.isPlatformOwner && !isHost) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the class host can start the live picture.",
        });
      }
      try {
        const live = await createOrGetMuxLiveStream({
          ownerUserId: session.hostUserId || userId,
          sessionId: session.id,
        });
        return publicMuxLiveHost(live);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Live video is not turned on yet. The platform owner still needs to connect the video account.",
          });
        }
        throw error;
      }
    }),

  watchClassLive: secureProcedure("video")
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = getLiveSession(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
      }
      const userId = String(ctx.user.id);
      const isHost = session.hostUserId === userId;
      if (!ctx.isPlatformOwner && !isHost && !userHasSessionAccess(input.sessionId, userId)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "A ticket is required to watch this live class.",
        });
      }
      const live = await refreshMuxLiveForSession(input.sessionId);
      if (!live) {
        return { status: "not_started" as const, playback: null, locked: false };
      }
      const viewer = publicMuxLiveViewer(live);
      if (!viewer.playbackId) {
        return { status: viewer.status, playback: null, locked: false };
      }
      try {
        const playback = await signMuxPlayback(viewer.playbackId);
        return { status: viewer.status, playback, locked: false };
      } catch (error) {
        if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") {
          return { status: viewer.status, playback: null, locked: true };
        }
        throw error;
      }
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
