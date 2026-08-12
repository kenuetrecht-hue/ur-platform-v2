/**
 * Stamps & AI Service Persistence Router
 * Handles database operations for stamps, loyalty points, and AI service access
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import {
  getLaunchDate,
  getLaunchWindowEnd,
  LAUNCH_CREATOR_SLOTS,
  LAUNCH_SIGNUP_WINDOW_DAYS,
} from "../../lib/launch-promotion-config";

export const stampsPersistenceRouter = router({
  /**
   * Get user's stamp balance
   */
  getStampBalance: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // TODO: Query userStamps table
      // SELECT * FROM userStamps WHERE userId = input.userId
      return {
        userId: input.userId,
        totalStamps: 0,
        availableStamps: 0,
        stampsUsed: 0,
        lastPurchaseDate: null,
      };
    }),

  /**
   * Purchase stamps (creates transaction record)
   */
  purchaseStamps: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        stampsAmount: z.number().min(1),
        transactionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Insert into stampTransactions table
      // TODO: Update userStamps table
      return {
        success: true,
        stampsAdded: input.stampsAmount,
        newBalance: 0, // TODO: Calculate from DB
      };
    }),

  /**
   * Redeem stamps for AI service access
   */
  redeemStampsForAIAccess: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        aiCreatorId: z.string(),
        aiCreatorName: z.string(),
        stampsToUse: z.number().min(1),
        durationHours: z.number().default(24),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Verify user has enough stamps
      // TODO: Insert into aiServiceAccess table
      // TODO: Deduct stamps from userStamps
      // TODO: Create stampTransaction record
      const accessEndDate = new Date();
      accessEndDate.setHours(accessEndDate.getHours() + input.durationHours);

      return {
        success: true,
        aiCreatorId: input.aiCreatorId,
        accessStartDate: new Date(),
        accessEndDate,
        stampsUsed: input.stampsToUse,
      };
    }),

  /**
   * Redeem loyalty points for AI service access
   */
  redeemLoyaltyPointsForAIAccess: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        aiCreatorId: z.string(),
        aiCreatorName: z.string(),
        loyaltyPointsToUse: z.number().min(2400),
        durationHours: z.number().default(24),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Verify user has enough loyalty points
      // TODO: Insert into aiServiceAccess table
      // TODO: Deduct loyalty points from loyaltyPoints table
      // TODO: Create audit log
      const accessEndDate = new Date();
      accessEndDate.setHours(accessEndDate.getHours() + input.durationHours);

      return {
        success: true,
        aiCreatorId: input.aiCreatorId,
        accessStartDate: new Date(),
        accessEndDate,
        loyaltyPointsUsed: input.loyaltyPointsToUse,
      };
    }),

  /**
   * Get user's active AI service access
   */
  getActiveAIAccess: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // TODO: Query aiServiceAccess table WHERE userId = input.userId AND status = 'active'
      return {
        activeAccess: [
          // {
          //   id: 1,
          //   aiCreatorId: "ai-wellness-coach",
          //   aiCreatorName: "AI Wellness Coach",
          //   accessStartDate: new Date(),
          //   accessEndDate: new Date(),
          //   redemptionType: "stamps",
          // }
        ],
      };
    }),

  /**
   * Check if user has access to specific AI creator
   */
  hasAccessToAI: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        aiCreatorId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // TODO: Query aiServiceAccess table
      // SELECT * FROM aiServiceAccess WHERE userId = input.userId AND aiCreatorId = input.aiCreatorId AND status = 'active' AND accessEndDate > NOW()
      return {
        hasAccess: false,
        accessEndDate: null,
      };
    }),

  /**
   * Get creator's promotion tier
   */
  getCreatorPromotionTier: publicProcedure
    .input(z.object({ creatorId: z.string() }))
    .query(async ({ input, ctx }) => {
      // TODO: Query creatorPromotionTier table
      return {
        creatorId: input.creatorId,
        tier: null,
        earningsPercentage: 85,
        promotionEndDate: null,
        freeTicketsPerWeek: 0,
        monthlyDrawingEligible: false,
      };
    }),

  /**
   * Register creator for promotion tier
   */
  registerCreatorForPromotion: publicProcedure
    .input(
      z.object({
        creatorId: z.string(),
        creatorName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Get current tier counts from promotionStats
      // TODO: Determine which tier this creator joins
      // TODO: Insert into creatorPromotionTier
      // TODO: Update promotionStats
      return {
        success: true,
        tier: 1,
        earningsPercentage: 92.5,
        promotionEndDate: new Date(),
      };
    }),

  /**
   * Get real-time promotion statistics
   */
  getPromotionStats: publicProcedure.query(async () => {
    let counts = { tier1: 0, tier2: 0, tier3: 0, totalJoined: 0 };
    try {
      counts = await db.getLaunchPromotionStats();
    } catch (error) {
      console.warn("[stamps] getPromotionStats fallback — DB unavailable:", error);
    }
    const launchDate = getLaunchDate();
    const windowEnd = getLaunchWindowEnd(launchDate);
    const now = Date.now();
    const isActive = now < windowEnd.getTime() && counts.totalJoined < LAUNCH_CREATOR_SLOTS;

    return {
      isActive,
      launchDate: launchDate.toISOString(),
      windowEnd: windowEnd.toISOString(),
      windowDays: LAUNCH_SIGNUP_WINDOW_DAYS,
      tier1: {
        joined: counts.tier1,
        capacity: 100,
        remaining: Math.max(0, 100 - counts.tier1),
      },
      tier2: {
        joined: counts.tier2,
        capacity: 100,
        remaining: Math.max(0, 100 - counts.tier2),
      },
      tier3: {
        joined: counts.tier3,
        capacity: 100,
        remaining: Math.max(0, 100 - counts.tier3),
      },
      totalJoined: counts.totalJoined,
      totalRemaining: Math.max(0, LAUNCH_CREATOR_SLOTS - counts.totalJoined),
    };
  }),

  /**
   * Get stamp transaction history
   */
  getStampTransactionHistory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      // TODO: Query stampTransactions table with limit
      return {
        transactions: [
          // {
          //   id: 1,
          //   transactionType: "purchase",
          //   stampsAmount: 10,
          //   reason: "10 Stamps for $4.99",
          //   createdAt: new Date(),
          // }
        ],
      };
    }),
});
