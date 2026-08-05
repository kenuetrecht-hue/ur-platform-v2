import { z } from "zod";
import {
  adminPermissionProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "../_core/trpc";
import {
  listAiSessionPrograms,
  setAiSessionProgram,
  getAiSessionProgram,
  CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
  MAX_SESSION_ATTENDEES,
  ALLOWED_SESSION_DURATIONS,
  computeSessionTicketCents,
  durationLabel,
  getSessionCommitmentSummary,
} from "../_core/ai-session-programming";
import {
  cancelLiveSession,
  confirmSessionPayment,
  createSessionCheckout,
  extendLiveSessionOvertime,
  getLiveSession,
  getOwnerSessionStats,
  getSessionJoinAccess,
  listLiveSessions,
  scheduleLiveSession,
} from "../_core/ai-live-session-service";
import {
  getVideoGenerationStatus,
  listCreatorVideos,
  requestCreatorVideo,
} from "../_core/ai-creator-video-service";

const durationSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);

function mapPublicSession(s: NonNullable<ReturnType<typeof getLiveSession>>) {
  const commitment = getSessionCommitmentSummary({
    startsAt: s.startsAt,
    committedDurationMinutes: s.committedDurationMinutes,
    overtimeMinutes: s.overtimeMinutes,
    allowOvertime: s.allowOvertime,
  });
  return {
    id: s.id,
    creatorAiId: s.creatorAiId,
    creatorName: s.creatorName,
    title: s.title,
    description: s.description,
    startsAt: s.startsAt,
    committedDurationMinutes: s.committedDurationMinutes,
    committedDurationLabel: durationLabel(s.committedDurationMinutes),
    durationMinutes: s.durationMinutes,
    overtimeMinutes: s.overtimeMinutes,
    allowOvertime: s.allowOvertime,
    priceCentsPerMinute: s.priceCentsPerMinute,
    pricePerMinuteUsd: (s.priceCentsPerMinute / 100).toFixed(2),
    priceCents: s.priceCents,
    priceUsd: (s.priceCents / 100).toFixed(2),
    maxAttendees: s.maxAttendees,
    attendeeCount: s.attendeeCount,
    spotsLeft: Math.max(0, s.maxAttendees - s.attendeeCount),
    status: s.status,
    commitment,
  };
}

export const aiLiveSessionRouter = router({
  listUpcoming: publicProcedure
    .input(z.object({ creatorAiId: z.string().optional() }).optional())
    .query(({ input }) => {
      const sessions = listLiveSessions({
        creatorAiId: input?.creatorAiId,
        upcomingOnly: true,
      });
      return sessions.map(mapPublicSession);
    }),

  getPublicSession: publicProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ input }) => {
      const session = getLiveSession(input.sessionId);
      if (!session) return null;
      return mapPublicSession(session);
    }),

  isLiveEnabled: publicProcedure
    .input(z.object({ creatorAiId: z.string().min(2).max(64) }))
    .query(({ input }) => {
      try {
        const program = getAiSessionProgram(input.creatorAiId);
        return { enabled: program.enabled };
      } catch {
        return { enabled: false };
      }
    }),

  createCheckout: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        attributionSlug: z.string().min(2).max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createSessionCheckout({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        userName: ctx.user.name ?? "UR User",
        isPlatformOwner: ctx.isPlatformOwner,
        attributionSlug: input.attributionSlug,
      });
    }),

  confirmPayment: protectedProcedure
    .input(z.object({ paymentIntentId: z.string().min(4).max(128) }))
    .mutation(async ({ ctx, input }) => {
      return confirmSessionPayment({
        paymentIntentId: input.paymentIntentId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
      });
    }),

  joinAccess: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return getSessionJoinAccess({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      });
    }),

  listPrograms: adminPermissionProcedure("manage_ai_sessions").query(() => {
    return listAiSessionPrograms().map((p) => ({
      ...p,
      ticketCents: computeSessionTicketCents(p.durationMinutes, p.priceCentsPerMinute),
      ticketUsd: (
        computeSessionTicketCents(p.durationMinutes, p.priceCentsPerMinute) / 100
      ).toFixed(2),
      pricePerMinuteUsd: (p.priceCentsPerMinute / 100).toFixed(2),
      minPriceCentsPerMinute: CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
      maxCapacity: MAX_SESSION_ATTENDEES,
      allowedDurations: [...ALLOWED_SESSION_DURATIONS],
    }));
  }),

  setProgram: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64),
        enabled: z.boolean().optional(),
        durationMinutes: durationSchema.optional(),
        priceCentsPerMinute: z.number().int().min(CREATOR_MIN_PRICE_CENTS_PER_MINUTE).optional(),
        maxAttendees: z.number().int().min(1).max(MAX_SESSION_ATTENDEES).optional(),
        allowOvertime: z.boolean().optional(),
        defaultTitle: z.string().max(200).optional(),
        hostScript: z.string().max(8000).optional(),
        sessionDescription: z.string().max(2000).optional(),
      }),
    )
    .mutation(({ input }) => setAiSessionProgram(input)),

  scheduleSession: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64),
        title: z.string().max(200).optional(),
        description: z.string().max(2000).optional(),
        startsAt: z.string().min(10).max(40),
        durationMinutes: durationSchema.optional(),
        priceCentsPerMinute: z.number().int().min(CREATOR_MIN_PRICE_CENTS_PER_MINUTE).optional(),
        maxAttendees: z.number().int().min(1).max(MAX_SESSION_ATTENDEES).optional(),
      }),
    )
    .mutation(({ input }) => scheduleLiveSession(input)),

  extendOvertime: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        sessionId: z.string().uuid(),
        additionalMinutes: z.number().int().min(5).max(120),
      }),
    )
    .mutation(({ input }) => extendLiveSessionOvertime(input)),

  listAllSessions: adminPermissionProcedure("manage_ai_sessions").query(() => {
    return listLiveSessions().map(mapPublicSession);
  }),

  cancelSession: adminPermissionProcedure("manage_ai_sessions")
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ input }) => cancelLiveSession(input.sessionId)),

  ownerStats: adminPermissionProcedure("manage_ai_sessions").query(() => getOwnerSessionStats()),

  videoGenStatus: adminPermissionProcedure("manage_ai_sessions").query(() =>
    getVideoGenerationStatus(),
  ),

  listCreatorVideos: adminPermissionProcedure("manage_ai_sessions")
    .input(z.object({ creatorAiId: z.string().optional() }).optional())
    .query(({ input }) => listCreatorVideos(input?.creatorAiId)),

  requestCreatorVideo: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64),
        topic: z.string().min(4).max(300),
        style: z.enum(["teaser", "lesson_clip", "follow_cta"]).optional(),
      }),
    )
    .mutation(({ input }) => requestCreatorVideo(input)),
});
