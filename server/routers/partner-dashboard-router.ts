import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminPermissionProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import {
  attachReferralAtSignup,
  enrollAffiliate,
  enrollContentCreator,
  getAffiliateDashboard,
  getCreatorDashboard,
  resolveAffiliateReferralCode,
  AFFILIATE_BONUS_CENTS,
  AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
} from "../_core/partner-program-service";
import {
  listLiveSessions,
  scheduleLiveSession,
  cancelLiveSession,
  getLiveSession,
  getSessionEnrollmentSummary,
} from "../_core/ai-live-session-service";
import { getReplayBySessionId } from "../_core/class-replay-service";
import {
  listAiSessionPrograms,
  CREATOR_MIN_PRICE_CENTS_PER_MINUTE,
} from "../_core/ai-session-programming";
import {
  getOrCreateUserLink,
  getUserLink,
  resolvePublicLink,
  listAllUserLinks,
} from "../_core/user-link-service";
import {
  formatTransactionForDisplay,
  getTransaction,
  getTransactionStats,
  listAllTransactions,
} from "../_core/transaction-ledger-service";
import {
  completeUpholdConnection,
  connectCryptoWallet,
  getCreatorPayoutDashboard,
  getUpholdConnectUrl,
  flushPendingPayouts,
} from "../_core/creator-payout-service";
import {
  getCreatorAnalytics,
  getCreatorPromoPayload,
  getClassSharePayload,
} from "../_core/creator-dashboard-service";
import {
  listAffiliatePosts,
  markPostPosted,
  processDueAutoPosts,
  scheduleAffiliatePost,
  scheduleWeeklyAutoPosts,
} from "../_core/affiliate-social-post-service";
import { AFFILIATE_ASSOCIATE_ID } from "../_core/affiliate-associate-ai";
import {
  getPremiumMediaStatus,
  purchaseAffiliateVoicePack,
  purchaseAiVideoTalkPack,
  purchaseCreatorVoicePack,
} from "../_core/ai-premium-media-service";

export const partnerDashboardRouter = router({
  resolveLink: publicProcedure
    .input(z.object({ slug: z.string().min(2).max(64) }))
    .query(({ input }) => resolvePublicLink(input.slug)),

  validateReferralCode: publicProcedure
    .input(z.object({ code: z.string().min(2).max(64) }))
    .query(({ input }) => {
      const affiliate = resolveAffiliateReferralCode(input.code);
      if (!affiliate) {
        const link = resolvePublicLink(input.code);
        if (link?.role === "affiliate") {
          return { valid: true as const, affiliateName: link.displayName, code: link.slug };
        }
        return { valid: false as const };
      }
      return {
        valid: true as const,
        affiliateName: affiliate.displayName,
        code: affiliate.customSlug,
      };
    }),

  /** Every member gets a permanent custom URL. */
  myCustomLink: protectedProcedure.query(({ ctx }) => {
    const link = getOrCreateUserLink({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
      displayName: ctx.user.name ?? "User",
    });
    return link;
  }),

  myTransactions: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional())
    .query(({ ctx, input }) => {
      const userId = String(ctx.user.id);
      const txs = listAllTransactions({ userId, limit: input?.limit ?? 50 });
      return {
        stats: getTransactionStats(userId),
        transactions: txs.map(formatTransactionForDisplay),
      };
    }),

  getTransaction: protectedProcedure
    .input(z.object({ transactionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const tx = getTransaction(input.transactionId);
      if (!tx) return null;
      const userId = String(ctx.user.id);
      const allowed =
        ctx.isPlatformOwner ||
        tx.payerUserId === userId ||
        tx.payeeUserId === userId ||
        tx.affiliateUserId === userId;
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your transaction." });
      }
      return formatTransactionForDisplay(tx);
    }),

  listAllTransactionsAdmin: adminPermissionProcedure("manage_ai_sessions")
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .query(({ input }) => ({
      stats: getTransactionStats(),
      links: listAllUserLinks(),
      transactions: listAllTransactions({ limit: input?.limit ?? 100 }).map(formatTransactionForDisplay),
    })),

  enrollCreator: protectedProcedure.mutation(({ ctx }) => {
    getOrCreateUserLink({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
      displayName: ctx.user.name ?? "Creator",
      role: "creator",
    });
    return enrollContentCreator({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
      displayName: ctx.user.name ?? "Creator",
    });
  }),

  enrollAffiliate: protectedProcedure.mutation(({ ctx }) => {
    return enrollAffiliate({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
      displayName: ctx.user.name ?? "Affiliate",
    });
  }),

  creatorDashboard: protectedProcedure.query(({ ctx }) => {
    const userId = String(ctx.user.id);
    const dash = getCreatorDashboard(userId);
    const link = getUserLink(userId);
    const tx = listAllTransactions({ userId, limit: 20 });
    const payout = getCreatorPayoutDashboard(userId);
    if (!dash.enrolled) return { ...dash, link, recentTransactions: [], payout, analytics: null, promo: null };
    return {
      ...dash,
      link,
      recentTransactions: tx.map(formatTransactionForDisplay),
      payout,
      analytics: getCreatorAnalytics(userId),
      promo: getCreatorPromoPayload(userId),
    };
  }),

  affiliateDashboard: protectedProcedure.query(({ ctx }) => {
    const dash = getAffiliateDashboard(String(ctx.user.id));
    const tx = listAllTransactions({ userId: String(ctx.user.id), limit: 20 });
    if (!dash.enrolled) return { ...dash, recentTransactions: [] };
    return {
      ...dash,
      recentTransactions: tx.map(formatTransactionForDisplay),
    };
  }),

  scheduleMyClass: protectedProcedure
    .input(
      z.object({
        creatorAiId: z.string().min(2).max(64),
        startsAt: z.string().min(10).max(40),
        title: z.string().max(200).optional(),
        durationMinutes: z
          .union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)])
          .optional(),
        maxAttendees: z.number().int().min(1).max(10_000).optional(),
        minAttendeesToStart: z.number().int().min(1).max(10_000).optional(),
        pricingTier: z.enum(["standard", "group_appointment"]).optional(),
        priceCentsPerMinute: z.number().int().min(1).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const dash = getCreatorDashboard(String(ctx.user.id));
      if (!dash.enrolled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Enroll as a content creator first.",
        });
      }
      return scheduleLiveSession({
        ...input,
        hostUserId: String(ctx.user.id),
      });
    }),

  listMyClasses: protectedProcedure.query(({ ctx }) => {
    const dash = getCreatorDashboard(String(ctx.user.id));
    if (!dash.enrolled) return [];
    return listLiveSessions()
      .filter((s) => s.hostUserId === String(ctx.user.id))
      .map((s) => {
        const enrollment = getSessionEnrollmentSummary(s);
        const replay = getReplayBySessionId(s.id);
        return {
          ...s,
          registeredCount: enrollment.registeredCount,
          spotsNeeded: enrollment.spotsNeeded,
          confirmedToRun: enrollment.confirmedToRun,
          enrollmentLabel: enrollment.enrollmentLabel,
          replayPublished: Boolean(replay?.published),
          replayId: replay?.id,
          replayPriceCents: replay?.priceCents,
          replayVideoEngine: replay?.muxPlaybackId || replay?.muxUploadId ? "mux" : replay?.videoUrl ? "external_https" : "archive",
          replayMuxStatus: replay?.muxStatus ?? null,
        };
      });
  }),

  cancelMyClass: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      const session = getLiveSession(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
      }
      if (session.hostUserId !== String(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your class." });
      }
      return cancelLiveSession(input.sessionId);
    }),

  classSharePayload: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const payload = getClassSharePayload(String(ctx.user.id), input.sessionId);
      if (!payload) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found." });
      }
      return payload;
    }),

  creatorPromo: protectedProcedure.query(({ ctx }) => {
    const dash = getCreatorDashboard(String(ctx.user.id));
    if (!dash.enrolled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Enroll as a content creator first." });
    }
    return getCreatorPromoPayload(String(ctx.user.id))!;
  }),

  listAvailableAis: protectedProcedure.query(() => {
    return listAiSessionPrograms({ enabledOnly: true }).map((p) => ({
      creatorAiId: p.creatorAiId,
      creatorName: p.creatorName,
      durationMinutes: p.durationMinutes,
      pricePerMinuteUsd: (p.priceCentsPerMinute / 100).toFixed(2),
      maxAttendees: p.maxAttendees,
    }));
  }),

  programInfo: publicProcedure.query(() => ({
    affiliateBonusUsd: (AFFILIATE_BONUS_CENTS / 100).toFixed(2),
    payoutAfterTransactions: AFFILIATE_PAYOUT_AFTER_TRANSACTIONS,
  })),

  payoutDashboard: protectedProcedure.query(({ ctx }) =>
    getCreatorPayoutDashboard(String(ctx.user.id)),
  ),

  upholdConnectUrl: protectedProcedure.query(({ ctx }) =>
    getUpholdConnectUrl(String(ctx.user.id)),
  ),

  connectUphold: protectedProcedure
    .input(
      z.object({
        upholdEmail: z.string().email(),
        oauthCode: z.string().optional(),
        state: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const profile = completeUpholdConnection({
        userId: String(ctx.user.id),
        upholdEmail: input.upholdEmail,
        oauthCode: input.oauthCode,
        state: input.state,
      });
      flushPendingPayouts(String(ctx.user.id));
      return profile;
    }),

  connectCryptoWallet: protectedProcedure
    .input(
      z.object({
        walletAddress: z.string().min(20).max(128),
        asset: z.enum(["USDC", "BTC", "ETH"]).optional(),
        network: z.enum(["ethereum", "polygon", "solana"]).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const profile = connectCryptoWallet({
        userId: String(ctx.user.id),
        walletAddress: input.walletAddress,
        asset: input.asset,
        network: input.network,
      });
      flushPendingPayouts(String(ctx.user.id));
      return profile;
    }),

  completePartnerEnrollment: protectedProcedure
    .input(
      z.object({
        role: z.enum(["creator", "affiliate"]),
        referralCode: z.string().max(64).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      getOrCreateUserLink({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        displayName: ctx.user.name ?? "User",
        role: input.role,
      });
      return attachReferralAtSignup({
        userId: String(ctx.user.id),
        userEmail: ctx.user.email ?? "",
        displayName: ctx.user.name ?? "User",
        role: input.role,
        referralCode: input.referralCode,
      });
    }),

  /** Affiliate Associate AI — social post queue */
  listAffiliateSocialPosts: protectedProcedure.query(({ ctx }) => {
    const dash = getAffiliateDashboard(String(ctx.user.id));
    if (!dash.enrolled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Join the affiliate program first." });
    }
    processDueAutoPosts();
    return listAffiliatePosts(String(ctx.user.id));
  }),

  scheduleAffiliateSocialPost: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok"]),
        body: z.string().min(1).max(2000),
        scheduledAt: z.string().optional(),
        autoPost: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const dash = getAffiliateDashboard(String(ctx.user.id));
      if (!dash.enrolled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Join the affiliate program first." });
      }
      return scheduleAffiliatePost({
        affiliateUserId: String(ctx.user.id),
        platform: input.platform,
        body: input.body,
        affiliateLink: dash.referralLink,
        scheduledAt: input.scheduledAt,
        autoPost: input.autoPost,
      });
    }),

  scheduleWeeklyAffiliatePosts: protectedProcedure.mutation(({ ctx }) => {
    const dash = getAffiliateDashboard(String(ctx.user.id));
    if (!dash.enrolled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Join the affiliate program first." });
    }
    return scheduleWeeklyAutoPosts({
      affiliateUserId: String(ctx.user.id),
      affiliateLink: dash.referralLink,
    });
  }),

  markAffiliatePostShared: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(({ ctx, input }) => markPostPosted(input.postId, String(ctx.user.id))),

  associateAiId: protectedProcedure.query(() => ({ creatorId: AFFILIATE_ASSOCIATE_ID })),

  premiumMediaStatus: protectedProcedure.query(({ ctx }) =>
    getPremiumMediaStatus(String(ctx.user.id)),
  ),

  purchaseCreatorVoice: protectedProcedure.mutation(({ ctx }) => {
    const dash = getCreatorDashboard(String(ctx.user.id));
    if (!dash.enrolled && !ctx.isPlatformOwner) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Enroll as a content creator first." });
    }
    return purchaseCreatorVoicePack({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
    });
  }),

  purchaseAffiliateVoice: protectedProcedure.mutation(({ ctx }) => {
    const dash = getAffiliateDashboard(String(ctx.user.id));
    if (!dash.enrolled && !ctx.isPlatformOwner) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Join the affiliate program first." });
    }
    return purchaseAffiliateVoicePack({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
    });
  }),

  purchaseAiVideoTalk: protectedProcedure.mutation(({ ctx }) =>
    purchaseAiVideoTalkPack({
      userId: String(ctx.user.id),
      userEmail: ctx.user.email ?? "",
      billingStateCode: "FL",
    }),
  ),
});
