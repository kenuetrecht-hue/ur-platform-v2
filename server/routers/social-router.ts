import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { secureProcedure, router } from "../_core/trpc";
import { assertUserIsAgeVerified } from "../_core/age-kyc-service";
import {
  getNativeLanguage,
  recordAndMonitorCommunication,
  throwIfWorldFlagged,
  translateForMember,
} from "../_core/world-monitor-service";
import { requireWorldAccess } from "./conduct-router";
import {
  acceptFriendRequest,
  getSocialDashboard,
  listDirectMessages,
  listInboxMail,
  listSentMail,
  markMailRead,
  registerSocialUser,
  sendDirectMessage,
  sendFriendRequest,
  sendPlatformMail,
  setRideAlongPreference,
  subscribeToCreator,
  unsubscribeFromCreator,
} from "../_core/social-service";
import {
  awardJoinCreatorPoints,
  awardSocialPostPoints,
  redeemLoyaltyReward,
} from "../_core/loyalty-activity-service";
import { listAllTransactions, getTransactionStats } from "../_core/transaction-ledger-service";
import {
  addIceCandidate,
  createVideoCall,
  endVideoCall,
  getVideoCallRoom,
  joinVideoCall,
  listIncomingCalls,
  setVideoAnswer,
  setVideoOffer,
} from "../_core/video-call-service";
import {
  addPostComment,
  createFeedPost,
  deleteFeedPost,
  getFeed,
  getFeedStats,
  getTrendingHashtags,
  listPostComments,
  recordPostShare,
  reactToPostWithStamp,
  togglePostLike,
  upsertSocialProfile,
  getSocialProfile,
  resolveCreatorDisplayName,
} from "../_core/social-feed-service";
import {
  generateSocialPostDraft,
  getSocialPostAssistantStatus,
  purchaseSocialPostAssistant,
  type PostAssistantPlan,
  type PostTone,
} from "../_core/social-post-assistant-service";
import { CONTENT_LICENSE_TYPES } from "../../lib/creator-content-protection-core";
import { getContentCreatorProfile } from "../_core/partner-program-service";
import {
  cancelPaidChannelSubscription,
  followCreatorChannel,
  getMyCreatorAudienceStatus,
  startPaidChannelSubscription,
  unfollowCreatorChannel,
} from "../_core/creator-audience-service";

const createPostInputSchema = z
  .object({
    body: z.string().max(4000).default(""),
    imageUrl: z.string().max(2000).optional(),
    videoUrl: z.string().max(2000).optional(),
    linkUrl: z.string().max(2000).optional(),
    visibility: z.enum(["public", "friends"]).optional(),
    aiAssisted: z.boolean().optional(),
    contentRightsMode: z.enum(["original", "licensed_repost"]).default("original"),
    rightsConfirmed: z.literal(true, {
      errorMap: () => ({
        message: "Confirm your content rights before publishing.",
      }),
    }),
    attributionSourceName: z.string().max(80).trim().optional(),
    attributionSourceUrl: z.string().max(2000).trim().optional(),
    licenseType: z.enum(CONTENT_LICENSE_TYPES).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.contentRightsMode !== "licensed_repost") return;
    if (!input.attributionSourceName || input.attributionSourceName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Credit the original creator or source by name.",
        path: ["attributionSourceName"],
      });
    }
    if (!input.licenseType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select how you are allowed to repost this content.",
        path: ["licenseType"],
      });
    }
  });

function requireEnrolledCreator(creatorUserId: string) {
  const creator = getContentCreatorProfile(creatorUserId);
  if (!creator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That member is not an enrolled content creator.",
    });
  }
  return creator;
}

function socialUser(ctx: { user: { id: string | number; email?: string | null; name?: string | null } }) {
  const userId = String(ctx.user.id);
  registerSocialUser({
    userId,
    email: ctx.user.email ?? "",
    displayName: ctx.user.name ?? "User",
  });
  return userId;
}

export const socialRouter = router({
  dashboard: secureProcedure("social").query(({ ctx }) => {
    const userId = String(ctx.user.id);
    registerSocialUser({
      userId,
      email: ctx.user.email ?? "",
      displayName: ctx.user.name ?? "User",
    });
    return getSocialDashboard(userId);
  }),

  sendFriendRequest: secureProcedure("social")
    .input(z.object({ friendEmail: z.string().email() }))
    .mutation(({ ctx, input }) => {
      const userId = String(ctx.user.id);
      registerSocialUser({
        userId,
        email: ctx.user.email ?? "",
        displayName: ctx.user.name ?? "User",
      });
      return sendFriendRequest({
        fromUserId: userId,
        fromEmail: ctx.user.email ?? "",
        fromName: ctx.user.name ?? "User",
        toEmail: input.friendEmail,
      });
    }),

  acceptFriendRequest: secureProcedure("social")
    .input(z.object({ friendshipId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      acceptFriendRequest({ userId: String(ctx.user.id), friendshipId: input.friendshipId }),
    ),

  sendMessage: secureProcedure("social")
    .input(
      z.object({
        recipientUserId: z.string().min(1),
        body: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireWorldAccess(ctx);
      const { flag } = await recordAndMonitorCommunication({
        channel: "direct_message",
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? undefined,
        peerId: input.recipientUserId,
        original: input.body,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      throwIfWorldFlagged(flag);
      const recipientNative = getNativeLanguage(input.recipientUserId);
      const deliveredBody =
        recipientNative !== "English"
          ? await translateForMember(input.body, recipientNative)
          : undefined;
      return sendDirectMessage({
        senderUserId: String(ctx.user.id),
        recipientUserId: input.recipientUserId,
        body: input.body,
        deliveredBody,
      });
    }),

  listMessages: secureProcedure("social")
    .input(z.object({ withUserId: z.string().min(1), limit: z.number().int().min(1).max(200).optional() }))
    .query(({ ctx, input }) =>
      listDirectMessages({
        userId: String(ctx.user.id),
        withUserId: input.withUserId,
        limit: input.limit,
      }),
    ),

  listInbox: secureProcedure("social")
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(({ ctx, input }) => {
      socialUser(ctx);
      return listInboxMail(String(ctx.user.id), input?.limit);
    }),

  listSent: secureProcedure("social")
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(({ ctx, input }) => {
      socialUser(ctx);
      return listSentMail(String(ctx.user.id), input?.limit);
    }),

  sendMail: secureProcedure("social")
    .input(
      z.object({
        toEmail: z.string().email(),
        subject: z.string().min(1).max(120),
        body: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireWorldAccess(ctx);
      const userId = socialUser(ctx);
      const { flag } = await recordAndMonitorCommunication({
        channel: "direct_message",
        userId,
        userEmail: ctx.user.email ?? undefined,
        original: `${input.subject}\n${input.body}`,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      throwIfWorldFlagged(flag);
      return sendPlatformMail({
        senderUserId: userId,
        senderEmail: ctx.user.email ?? "",
        senderName: ctx.user.name ?? "UR Member",
        toEmail: input.toEmail,
        subject: input.subject,
        body: input.body,
      });
    }),

  markMailRead: secureProcedure("social")
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      markMailRead({ userId: String(ctx.user.id), messageId: input.messageId }),
    ),

  subscribeCreator: secureProcedure("social")
    .input(
      z.object({
        creatorUserId: z.string().trim().min(1).max(80),
        creatorName: z.string().min(1).max(120),
        creatorSlug: z.string().max(64).optional(),
        rideAlongWithAi: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireEnrolledCreator(input.creatorUserId);
      const sub = subscribeToCreator({
        subscriberUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
        creatorName: input.creatorName,
        creatorSlug: input.creatorSlug,
        rideAlongWithAi: input.rideAlongWithAi,
      });
      const loyalty = awardJoinCreatorPoints({
        userId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
        creatorName: input.creatorName,
      });
      return { ...sub, loyaltyPointsAwarded: loyalty.points };
    }),

  unsubscribeCreator: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().trim().min(1).max(80) }))
    .mutation(({ ctx, input }) =>
      unsubscribeFromCreator({
        subscriberUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
      }),
    ),

  followCreator: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().trim().min(1).max(80) }))
    .mutation(({ ctx, input }) => {
      const creator = requireEnrolledCreator(input.creatorUserId);
      followCreatorChannel({
        followerUserId: String(ctx.user.id),
        creatorUserId: creator.userId,
      });
      return getMyCreatorAudienceStatus({
        fanUserId: String(ctx.user.id),
        creatorUserId: creator.userId,
      });
    }),

  unfollowCreator: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().trim().min(1).max(80) }))
    .mutation(({ ctx, input }) => {
      unfollowCreatorChannel({
        followerUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
      });
      return getMyCreatorAudienceStatus({
        fanUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
      });
    }),

  subscribePaidChannel: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().trim().min(1).max(80) }))
    .mutation(({ ctx, input }) => {
      const creator = requireEnrolledCreator(input.creatorUserId);
      startPaidChannelSubscription({
        subscriberUserId: String(ctx.user.id),
        creatorUserId: creator.userId,
      });
      return getMyCreatorAudienceStatus({
        fanUserId: String(ctx.user.id),
        creatorUserId: creator.userId,
      });
    }),

  cancelPaidChannel: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().trim().min(1).max(80) }))
    .mutation(({ ctx, input }) => {
      cancelPaidChannelSubscription({
        subscriberUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
      });
      return getMyCreatorAudienceStatus({
        fanUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
      });
    }),

  creatorAudience: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().trim().min(1).max(80) }))
    .query(({ ctx, input }) =>
      getMyCreatorAudienceStatus({
        fanUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
      }),
    ),

  setRideAlong: secureProcedure("social")
    .input(z.object({ creatorUserId: z.string().min(1), rideAlongWithAi: z.boolean() }))
    .mutation(({ ctx, input }) =>
      setRideAlongPreference({
        subscriberUserId: String(ctx.user.id),
        creatorUserId: input.creatorUserId,
        rideAlongWithAi: input.rideAlongWithAi,
      }),
    ),

  myActivitySummary: secureProcedure("social").query(async ({ ctx }) => {
    const userId = String(ctx.user.id);
    const txStats = getTransactionStats(userId);
    const txs = listAllTransactions({ userId, limit: 10 });
    let loyaltyPoints = 0;
    try {
      const db = await import("../db");
      const record = await db.getLoyaltyPoints(ctx.user.id);
      loyaltyPoints = record?.totalPoints ?? 0;
    } catch {
      loyaltyPoints = 0;
    }
    const creatorProfile = getContentCreatorProfile(userId);
    const social = getSocialDashboard(userId);
    return {
      loyaltyPoints,
      transactionCount: txStats.totalTransactions,
      totalSpentOrEarnedCents: txStats.totalVolumeCents,
      recentTransactions: txs,
      friendCount: social.friends.length,
      subscriptionCount: social.subscriptions.length,
      subscriberCount: creatorProfile ? social.subscribers.length : 0,
      isCreator: Boolean(creatorProfile),
    };
  }),

  createVideoCall: secureProcedure("social")
    .input(z.object({ friendUserId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      createVideoCall({
        callerUserId: String(ctx.user.id),
        calleeUserId: input.friendUserId,
      }),
    ),

  joinVideoCall: secureProcedure("social")
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      joinVideoCall({ roomId: input.roomId, userId: String(ctx.user.id) }),
    ),

  endVideoCall: secureProcedure("social")
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      endVideoCall({ roomId: input.roomId, userId: String(ctx.user.id) }),
    ),

  getVideoCall: secureProcedure("social")
    .input(z.object({ roomId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const room = getVideoCallRoom(input.roomId);
      if (!room) return null;
      const userId = String(ctx.user.id);
      if (room.callerUserId !== userId && room.calleeUserId !== userId) return null;
      return room;
    }),

  incomingVideoCalls: secureProcedure("social").query(({ ctx }) =>
    listIncomingCalls(String(ctx.user.id)),
  ),

  signalVideoOffer: secureProcedure("social")
    .input(z.object({ roomId: z.string().uuid(), sdp: z.string().max(50000) }))
    .mutation(({ ctx, input }) =>
      setVideoOffer(input.roomId, String(ctx.user.id), input.sdp),
    ),

  signalVideoAnswer: secureProcedure("social")
    .input(z.object({ roomId: z.string().uuid(), sdp: z.string().max(50000) }))
    .mutation(({ ctx, input }) =>
      setVideoAnswer(input.roomId, String(ctx.user.id), input.sdp),
    ),

  signalIceCandidate: secureProcedure("social")
    .input(z.object({ roomId: z.string().uuid(), candidate: z.string().max(8000) }))
    .mutation(({ ctx, input }) =>
      addIceCandidate({
        roomId: input.roomId,
        userId: String(ctx.user.id),
        candidate: input.candidate,
      }),
    ),

  // ── Public feed (Facebook / TikTok-style free posts) ──

  feed: secureProcedure("social")
    .input(
      z
        .object({
          sort: z.enum(["latest", "top", "friends"]).optional(),
          hashtag: z.string().max(64).optional(),
          authorUserId: z.string().optional(),
          limit: z.number().int().min(1).max(50).optional(),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      getFeed({
        viewerUserId: socialUser(ctx),
        sort: input?.sort ?? "latest",
        hashtag: input?.hashtag,
        authorUserId: input?.authorUserId,
        limit: input?.limit,
        cursor: input?.cursor,
      }),
    ),

  trendingHashtags: secureProcedure("social").query(() => getTrendingHashtags()),

  feedStats: secureProcedure("social").query(({ ctx }) => getFeedStats(socialUser(ctx))),

  myProfile: secureProcedure("social").query(({ ctx }) => {
    const userId = socialUser(ctx);
    return getSocialProfile(userId);
  }),

  updateProfile: secureProcedure("social")
    .input(z.object({ bio: z.string().max(280).optional(), displayName: z.string().max(80).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      const userId = socialUser(ctx);
      const existing = getSocialProfile(userId);
      return upsertSocialProfile({
        userId,
        email: ctx.user.email ?? "",
        displayName: input.displayName?.trim() || existing?.displayName || ctx.user.name || "User",
        bio: input.bio,
      });
    }),

  createPost: secureProcedure("social")
    .input(createPostInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      requireWorldAccess(ctx);
      const userId = socialUser(ctx);
      const { flag } = await recordAndMonitorCommunication({
        channel: "social_post",
        userId,
        userEmail: ctx.user.email ?? undefined,
        original: input.body,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      throwIfWorldFlagged(flag);
      const post = createFeedPost({
        authorUserId: userId,
        authorEmail: ctx.user.email ?? "",
        authorName: resolveCreatorDisplayName(userId, ctx.user.name ?? "User"),
        body: input.body,
        imageUrl: input.imageUrl,
        videoUrl: input.videoUrl,
        linkUrl: input.linkUrl,
        visibility: input.visibility,
        aiAssisted: input.aiAssisted,
        contentRightsMode: input.contentRightsMode,
        rightsConfirmed: input.rightsConfirmed === true,
        attributionSourceName: input.attributionSourceName,
        attributionSourceUrl: input.attributionSourceUrl,
        licenseType: input.licenseType,
      });
      const loyalty = awardSocialPostPoints(socialUser(ctx));
      return { ...post, loyaltyPointsAwarded: loyalty.points };
    }),

  deletePost: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      deleteFeedPost({ postId: input.postId, userId: socialUser(ctx) });
      return { deleted: true as const };
    }),

  toggleLike: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      return togglePostLike({ postId: input.postId, userId: socialUser(ctx) });
    }),

  reactWithStamp: secureProcedure("stamps")
    .input(
      z.object({
        postId: z.string().trim().uuid(),
        instanceId: z.string().trim().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      requireWorldAccess(ctx);
      return reactToPostWithStamp({
        postId: input.postId,
        userId: socialUser(ctx),
        displayName: ctx.user.name ?? undefined,
        instanceId: input.instanceId,
      });
    }),

  addComment: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid(), body: z.string().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      requireWorldAccess(ctx);
      const userId = socialUser(ctx);
      const { flag } = await recordAndMonitorCommunication({
        channel: "social_post",
        userId,
        userEmail: ctx.user.email ?? undefined,
        original: input.body,
        isPlatformOwner: ctx.isPlatformOwner,
      });
      throwIfWorldFlagged(flag);
      return addPostComment({
        postId: input.postId,
        authorUserId: userId,
        authorName: resolveCreatorDisplayName(userId, ctx.user.name ?? "User"),
        body: input.body,
      });
    }),

  listComments: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid(), limit: z.number().int().min(1).max(100).optional() }))
    .query(({ input }) => listPostComments(input.postId, input.limit)),

  sharePost: secureProcedure("social")
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserIsAgeVerified(ctx.user.id);
      return recordPostShare(input.postId);
    }),

  // ── Social Post Assistant (AI subscription for basic users) ──

  postAssistantStatus: secureProcedure("social").query(({ ctx }) =>
    getSocialPostAssistantStatus(String(ctx.user.id), ctx.isPlatformOwner),
  ),

  purchasePostAssistant: secureProcedure("social")
    .input(z.object({ plan: z.enum(["day", "week", "month", "year"]) }))
    .mutation(({ ctx, input }) =>
      purchaseSocialPostAssistant({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        plan: input.plan as PostAssistantPlan,
      }),
    ),

  assistPostDraft: secureProcedure("social")
    .input(
      z.object({
        prompt: z.string().min(1).max(500),
        tone: z.enum(["casual", "funny", "heartfelt", "professional", "hype", "question"]).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      generateSocialPostDraft({
        userId: String(ctx.user.id),
        userName: ctx.user.name ?? "User",
        prompt: input.prompt,
        tone: input.tone as PostTone | undefined,
        isPlatformOwner: ctx.isPlatformOwner,
      }),
    ),
});
