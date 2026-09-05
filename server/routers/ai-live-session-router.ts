import { z } from "zod";
import {
  adminPermissionProcedure,
  publicProcedure,
  protectedProcedure,
  secureCheckoutProcedure,
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
  expressInterestInSession,
  cancelInterestInSession,
  backOutOfLiveSession,
  userHasInterestInSession,
  userHasSessionAccess,
  getLiveSession,
  getOwnerSessionStats,
  getSessionEnrollmentSummary,
  getSessionJoinAccess,
  listLiveSessions,
  scheduleLiveSession,
} from "../_core/ai-live-session-service";
import { assertSectionEnabledForRequest } from "../_core/platform-section-guard";
import {
  getCreatorVideo,
  getVideoGenerationStatus,
  listCreatorVideos,
  requestCreatorVideo,
} from "../_core/ai-creator-video-service";
import {
  generateHourLessonVideo,
  listPublishableHourLessons,
  publishHourLessonHourglass,
} from "../_core/ai-hour-lesson-service";
import { buildClassReplayPurchaseSummary, buildLiveClassPurchaseSummary } from "../../lib/pricing-disclosures";
import {
  confirmReplayPayment,
  createReplayCheckout,
  getClassReplay,
  getReplayBySessionId,
  getReplayWatchAccess,
  getReplayWatchPlayback,
  listPublishedReplays,
  publicReplay,
  publishClassReplay,
  suggestedReplayPriceCents,
  unpublishClassReplay,
} from "../_core/class-replay-service";
import { defaultClassReplayPriceCents } from "../../lib/class-replay-policy";
import { optionalBillingStateSchema, billingStateSchema } from "../../lib/billing-state-schema";
import {
  getLiveSessionRoomState,
  submitLiveSessionQuestion,
  markLiveSessionQuestionAnswered,
  optIntoLiveSessionOvertime,
  leaveLiveSessionRoom,
  purchaseLiveSessionSpeakAccess,
} from "../_core/live-session-room-service";

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
  const enrollment = getSessionEnrollmentSummary(s);
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
    minAttendeesToStart: enrollment.minAttendeesToStart,
    attendeeCount: enrollment.ticketCount,
    registeredCount: enrollment.registeredCount,
    interestCount: enrollment.interestCount,
    spotsNeeded: enrollment.spotsNeeded,
    confirmedToRun: enrollment.confirmedToRun,
    enrollmentStatus: enrollment.enrollmentStatus,
    enrollmentLabel: enrollment.enrollmentLabel,
    enrollmentDeadlineAt: enrollment.enrollmentDeadlineAt,
    enrollmentOpen: enrollment.enrollmentOpen,
    minimumCheckAt: enrollment.minimumCheckAt,
    backoutDeadlineAt: enrollment.backoutDeadlineAt,
    backoutOpen: enrollment.backoutOpen,
    inFillWindow: enrollment.inFillWindow,
    fillWindowStartAt: enrollment.fillWindowStartAt,
    peakPaidCount: enrollment.peakPaidCount,
    patienceGracePending: enrollment.patienceGracePending,
    patienceGraceActive: enrollment.patienceGraceActive,
    pricingTier: s.pricingTier,
    pricingTierLabel:
      s.pricingTier === "group_appointment" ? "Group appointment" : "Standard live class",
    refundsOnUnderfill: s.refundsOnUnderfill,
    ticketOnlyMinimum: s.ticketOnlyMinimum,
    refundsProcessed: s.refundsProcessed,
    spotsLeft: Math.max(0, s.maxAttendees - enrollment.registeredCount),
    status: s.status,
    commitment,
    lessonVideoId: s.lessonVideoId ?? null,
    hourglass: s.committedDurationMinutes === 60,
    hasGeneratedLesson: Boolean(s.lessonVideoId),
    lessonTitle: s.lessonVideoId ? getCreatorVideo(s.lessonVideoId)?.title ?? null : null,
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

  createCheckout: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        sessionId: z.string().uuid(),
        stateCode: optionalBillingStateSchema,
        attributionSlug: z.string().min(2).max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      return createSessionCheckout({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        userName: ctx.user.name ?? "UR User",
        isPlatformOwner: ctx.isPlatformOwner,
        billingStateCode: input.stateCode,
        attributionSlug: input.attributionSlug,
      });
    }),

  getPurchaseSummary: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        stateCode: optionalBillingStateSchema,
      }),
    )
    .query(({ input }) => {
      const session = getLiveSession(input.sessionId);
      if (!session) return null;
      const enrollment = getSessionEnrollmentSummary(session);
      return buildLiveClassPurchaseSummary({
        sessionTitle: session.title,
        creatorName: session.creatorName,
        durationMinutes: session.durationMinutes,
        priceCentsPerMinute: session.priceCentsPerMinute,
        ticketSubtotalCents: session.priceCents,
        minAttendeesToStart: enrollment.minAttendeesToStart,
        pricingTier: session.pricingTier,
        refundsOnUnderfill: session.refundsOnUnderfill,
        ticketOnlyMinimum: session.ticketOnlyMinimum,
        startsAt: session.startsAt,
        stateCode: input.stateCode ?? null,
      });
    }),

  confirmPayment: secureCheckoutProcedure("commerce")
    .input(z.object({ paymentIntentId: z.string().min(4).max(128) }))
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      return confirmSessionPayment({
        paymentIntentId: input.paymentIntentId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
      });
    }),

  expressInterest: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      expressInterestInSession({ sessionId: input.sessionId, userId: String(ctx.user.id) }),
    ),

  cancelInterest: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      cancelInterestInSession({ sessionId: input.sessionId, userId: String(ctx.user.id) }),
    ),

  backOut: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) =>
      backOutOfLiveSession({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
      }),
    ),

  hasTicket: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => ({
      hasTicket: userHasSessionAccess(input.sessionId, String(ctx.user.id)),
      hasInterest: userHasInterestInSession(input.sessionId, String(ctx.user.id)),
    })),

  hasInterest: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => ({
      hasInterest: userHasInterestInSession(input.sessionId, String(ctx.user.id)),
    })),

  joinAccess: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return getSessionJoinAccess({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      });
    }),

  getRoomState: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      getLiveSessionRoomState({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        userLabel: ctx.user.name ?? ctx.user.email ?? "Attendee",
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  submitQuestion: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        channel: z.enum(["voice", "text"]),
        questionText: z.string().min(4).max(500).trim(),
      }),
    )
    .mutation(({ ctx, input }) =>
      submitLiveSessionQuestion({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        userLabel: ctx.user.name ?? ctx.user.email ?? "Attendee",
        isPlatformOwner: ctx.isPlatformOwner,
        channel: input.channel,
        questionText: input.questionText,
      }),
    ),

  markQuestionAnswered: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        questionId: z.string().uuid(),
      }),
    )
    .mutation(({ ctx, input }) =>
      markLiveSessionQuestionAnswered({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        questionId: input.questionId,
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  optIntoOvertime: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      optIntoLiveSessionOvertime({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  leaveRoom: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      leaveLiveSessionRoom({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  purchaseSpeakAccess: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        sessionId: z.string().uuid(),
        stateCode: billingStateSchema,
        clientPlatform: z.enum(["web", "native"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      return purchaseLiveSessionSpeakAccess({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        isPlatformOwner: ctx.isPlatformOwner,
        billingStateCode: input.stateCode,
        clientPlatform: input.clientPlatform,
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
        maxAttendees: z.number().int().min(1).max(MAX_SESSION_ATTENDEES).optional(),
        minAttendeesToStart: z.number().int().min(1).max(10_000).optional(),
        pricingTier: z.enum(["standard", "group_appointment"]).optional(),
        priceCentsPerMinute: z.number().int().min(1).optional(),
        lessonVideoId: z.string().uuid().optional(),
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

  listReplays: publicProcedure
    .input(z.object({ creatorAiId: z.string().min(2).max(64).optional() }).optional())
    .query(({ input }) => listPublishedReplays({ creatorAiId: input?.creatorAiId }).map(publicReplay)),

  getReplay: publicProcedure
    .input(z.object({ replayId: z.string().uuid() }))
    .query(({ input }) => {
      const replay = getClassReplay(input.replayId);
      if (!replay || !replay.published) return null;
      return publicReplay(replay);
    }),

  replayPurchaseSummary: publicProcedure
    .input(
      z.object({
        replayId: z.string().uuid(),
        stateCode: optionalBillingStateSchema,
      }),
    )
    .query(({ input }) => {
      const replay = getClassReplay(input.replayId);
      if (!replay || !replay.published) return null;
      return buildClassReplayPurchaseSummary({
        title: replay.title,
        creatorName: replay.creatorName,
        durationMinutes: replay.durationMinutes,
        priceCents: replay.priceCents,
        stateCode: input.stateCode ?? null,
      });
    }),

  publishReplay: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        priceCents: z.number().int().min(0).max(50_000),
        videoUrl: z.string().trim().max(500).optional(),
        muxUploadId: z.string().uuid().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      publishClassReplay({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
        priceCents: input.priceCents,
        videoUrl: input.videoUrl,
        muxUploadId: input.muxUploadId,
      }),
    ),

  unpublishReplay: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      unpublishClassReplay({
        sessionId: input.sessionId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),

  replayForSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ input }) => {
      const replay = getReplayBySessionId(input.sessionId);
      return replay ? publicReplay(replay) : null;
    }),

  suggestedReplayPrice: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ input }) => ({
      priceCents: suggestedReplayPriceCents(input.sessionId),
      defaultHint: defaultClassReplayPriceCents(0),
    })),

  createReplayCheckout: secureCheckoutProcedure("commerce")
    .input(
      z.object({
        replayId: z.string().uuid(),
        stateCode: optionalBillingStateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      return createReplayCheckout({
        replayId: input.replayId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        userName: ctx.user.name ?? "UR User",
        isPlatformOwner: ctx.isPlatformOwner,
        billingStateCode: input.stateCode,
      });
    }),

  confirmReplayPayment: secureCheckoutProcedure("commerce")
    .input(z.object({ paymentIntentId: z.string().min(8).max(128) }))
    .mutation(async ({ ctx, input }) => {
      assertSectionEnabledForRequest("commerce", ctx.isPlatformOwner);
      return confirmReplayPayment({
        paymentIntentId: input.paymentIntentId,
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
      });
    }),

  watchReplay: protectedProcedure
    .input(z.object({ replayId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const access = getReplayWatchAccess({
        replayId: input.replayId,
        userId: String(ctx.user.id),
        isPlatformOwner: ctx.isPlatformOwner,
      });
      if (!access.allowed) {
        return { ...access, playback: null };
      }
      try {
        const playback = await getReplayWatchPlayback({
          replayId: input.replayId,
          userId: String(ctx.user.id),
          isPlatformOwner: ctx.isPlatformOwner,
        });
        return { ...access, playback };
      } catch {
        return { ...access, playback: null };
      }
    }),

  requestCreatorVideo: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64),
        topic: z.string().min(4).max(300),
        style: z.enum(["teaser", "lesson_clip", "follow_cta"]).optional(),
      }),
    )
    .mutation(({ input }) => requestCreatorVideo(input)),

  listHourLessons: adminPermissionProcedure("manage_ai_sessions").query(() =>
    listPublishableHourLessons(),
  ),

  generateHourLesson: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64).trim(),
        catalogId: z.string().min(4).max(64).trim().optional(),
        topic: z.string().min(4).max(300).trim().optional(),
      }),
    )
    .mutation(({ input }) => generateHourLessonVideo(input)),

  publishHourLesson: adminPermissionProcedure("manage_ai_sessions")
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64).trim(),
        startsAt: z.string().min(10).max(40).trim(),
        catalogId: z.string().min(4).max(64).trim().optional(),
        topic: z.string().min(4).max(300).trim().optional(),
        priceCentsPerMinute: z.number().int().min(CREATOR_MIN_PRICE_CENTS_PER_MINUTE).max(100_000).optional(),
      }),
    )
    .mutation(({ input }) => publishHourLessonHourglass(input)),
});
