import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

import {
  kycVerification,
  emailVerificationAudit,
  launchPromotionTiers,
  platformFeeTracking,
  InsertKycVerification,
  InsertEmailVerificationAudit,
  InsertLaunchPromotionTier,
  InsertPlatformFeeTracking,
} from "../drizzle/schema";

// ============ KYC VERIFICATION ============

export async function getKycVerification(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(kycVerification)
    .where(eq(kycVerification.userId, userId));

  return result[0] || null;
}

export async function createKycVerification(data: InsertKycVerification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(kycVerification).values(data);
  return (result as any).insertId || 0;
}

export async function updateKycVerification(
  userId: number,
  data: Partial<InsertKycVerification>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(kycVerification)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(kycVerification.userId, userId));
}

// ============ EMAIL VERIFICATION ============

export async function createEmailVerificationAudit(
  data: InsertEmailVerificationAudit
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(emailVerificationAudit).values(data);
  return (result as any).insertId || 0;
}

export async function getEmailVerificationAudit(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(emailVerificationAudit)
    .where(eq(emailVerificationAudit.token, token));

  return result[0] || null;
}

export async function updateEmailVerificationStatus(
  token: string,
  status: "sent" | "verified" | "expired"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(emailVerificationAudit)
    .set({
      status,
      verifiedAt: status === "verified" ? new Date() : undefined,
    })
    .where(eq(emailVerificationAudit.token, token));
}

// ============ LAUNCH PROMOTION TIERS ============

/**
 * Get the current registration count to determine tier assignment
 */
export async function getCurrentRegistrationCount() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(launchPromotionTiers);

  return result.length + 1; // Next registration index
}

/**
 * Determine promotional tier based on registration index
 */
export function determineTier(registrationIndex: number): "tier_1" | "tier_2" | "tier_3" | null {
  if (registrationIndex <= 100) return "tier_1";
  if (registrationIndex <= 200) return "tier_2";
  if (registrationIndex <= 300) return "tier_3";
  return null; // No promotion after 300 users
}

/**
 * Create launch promotion tier for new user
 */
export async function createLaunchPromotionTier(
  userId: number,
  registrationIndex: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tier = determineTier(registrationIndex);
  if (!tier) return null; // No promotion for users beyond 300

  const now = new Date();
  const launchDate = new Date("2026-05-27"); // Launch date (adjust as needed)
  const day31 = new Date(launchDate.getTime() + 31 * 24 * 60 * 60 * 1000);

  let tier1DiscountPercentage = null;
  let tier1DiscountDurationDays = null;
  let tier2DiscountPercentage = null;
  let tier2DiscountDurationDays = null;
  let tier3DiscountPercentage = null;
  let tier3DiscountDurationDays = null;
  let lifetimeDrawingEntries = 0;
  let discountDurationDays = 0;

  if (tier === "tier_1") {
    tier1DiscountPercentage = 50.0;
    tier1DiscountDurationDays = 180;
    lifetimeDrawingEntries = 2;
    discountDurationDays = 180;
  } else if (tier === "tier_2") {
    tier2DiscountPercentage = 60.0;
    tier2DiscountDurationDays = 90;
    discountDurationDays = 90;
  } else if (tier === "tier_3") {
    tier3DiscountPercentage = 50.0;
    tier3DiscountDurationDays = 30;
    discountDurationDays = 30;
  }

  const discountEndDate = new Date(
    now.getTime() + discountDurationDays * 24 * 60 * 60 * 1000
  );

  const data: InsertLaunchPromotionTier = {
    userId,
    registrationIndex,
    tier,
    tier1DiscountPercentage: tier1DiscountPercentage ? (tier1DiscountPercentage as any) : undefined,
    tier1DiscountDurationDays,
    tier2DiscountPercentage: tier2DiscountPercentage ? (tier2DiscountPercentage as any) : undefined,
    tier2DiscountDurationDays,
    tier3DiscountPercentage: tier3DiscountPercentage ? (tier3DiscountPercentage as any) : undefined,
    tier3DiscountDurationDays,
    lifetimeDrawingEntries,
    genesisClock24HourStartTime: now,
    genesisClock24HourEndTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    genesisClock24HourActive: true,
    freeDayOfServiceActive: true,
    freeDayOfServiceExpiresAt: day31,
    discountStartDate: now,
    discountEndDate,
    discountActive: true,
  };

  const result = await db.insert(launchPromotionTiers).values(data);
  return (result as any).insertId || 0;
}

export async function getLaunchPromotionTier(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(launchPromotionTiers)
    .where(eq(launchPromotionTiers.userId, userId));

  return result[0] || null;
}

// ============ PLATFORM FEE TRACKING ============

export async function createPlatformFeeTracking(
  data: InsertPlatformFeeTracking
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(platformFeeTracking).values(data);
  return (result as any).insertId || 0;
}

export async function getPlatformFeeTracking(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(platformFeeTracking)
    .where(eq(platformFeeTracking.userId, userId));

  return result[0] || null;
}

export async function updatePlatformFeeTracking(
  userId: number,
  data: Partial<InsertPlatformFeeTracking>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(platformFeeTracking)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(platformFeeTracking.userId, userId));
}

/**
 * Calculate current platform fee percentage for user
 * Considers Genesis Clock (24-hour zero-tax) and active promotions
 */
export async function calculateCurrentPlatformFee(userId: number): Promise<number> {
  const feeTracking = await getPlatformFeeTracking(userId);
  if (!feeTracking) return 0.15; // Default 15%

  const now = new Date();

  // Check Genesis Clock (24-hour zero-tax window)
  if (
    feeTracking.genesisClock24HourActive &&
    feeTracking.genesisClock24HourEndTime &&
    now < feeTracking.genesisClock24HourEndTime
  ) {
    return 0.0; // 0% during Genesis Clock
  }

  // Check active promotion discount
  if (
    feeTracking.activePromotionTier !== "none" &&
    feeTracking.promotionEndDate &&
    now < feeTracking.promotionEndDate
  ) {
    // Apply promotion discount to base fee
    const baseFee = 0.15;
    const discountPercentage = (Number(feeTracking.promotionDiscountPercentage) || 0) / 100;
    return baseFee * (1 - discountPercentage);
  }

  return 0.15; // Default 15%
}

/**
 * Activate Genesis Clock for user (24-hour zero-tax window)
 */
export async function activateGenesisClock(userId: number) {
  const now = new Date();
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await updatePlatformFeeTracking(userId, {
    genesisClock24HourActive: true,
    genesisClock24HourEndTime: endTime,
  });
}

/**
 * Activate promotion tier discount for user
 */
export async function activatePromotionDiscount(
  userId: number,
  tier: "tier_1" | "tier_2" | "tier_3",
  discountPercentage: number,
  durationDays: number
) {
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await updatePlatformFeeTracking(userId, {
    activePromotionTier: tier,
    promotionDiscountPercentage: discountPercentage as any,
    promotionEndDate: endDate,
  });
}


// ============ LOYALTY POINTS ============

import {
  loyaltyPoints,
  loyaltyPointsAudit,
  scratchOffTickets,
  weeklyDrawingEntries,
  InsertLoyaltyPoints,
  InsertLoyaltyPointsAudit,
  InsertScratchOffTicket,
  InsertWeeklyDrawingEntry,
} from "../drizzle/schema";

export async function getLoyaltyPoints(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.userId, userId));

  return result[0] || null;
}

export async function createLoyaltyPoints(data: InsertLoyaltyPoints) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(loyaltyPoints).values(data);
  return (result as any).insertId || 0;
}

/**
 * Award daily sign-in loyalty points (200 points per sign-in)
 * Also creates a scratch-off ticket
 */
export async function awardDailySignInPoints(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Get or create loyalty points record
  let loyaltyRecord = await getLoyaltyPoints(userId);
  if (!loyaltyRecord) {
    await createLoyaltyPoints({
      userId,
      totalPoints: 0,
      totalSignIns: 0,
      totalPointsEarned: 0,
    });
    loyaltyRecord = await getLoyaltyPoints(userId);
  }

  // Check if already earned today
  const lastEarnedDate = loyaltyRecord?.lastEarnedDate
    ? loyaltyRecord.lastEarnedDate.toISOString().split("T")[0]
    : null;

  if (lastEarnedDate === today) {
    return { alreadyEarnedToday: true, points: 0 };
  }

  // Award 200 points
  const pointsToAward = 200;
  await db
    .update(loyaltyPoints)
    .set({
      totalPoints: (loyaltyRecord?.totalPoints || 0) + pointsToAward,
      totalSignIns: (loyaltyRecord?.totalSignIns || 0) + 1,
      totalPointsEarned: (loyaltyRecord?.totalPointsEarned || 0) + pointsToAward,
      pointsEarnedToday: pointsToAward,
      lastEarnedDate: now,
    })
    .where(eq(loyaltyPoints.userId, userId));

  // Create audit record
  await db.insert(loyaltyPointsAudit).values({
    userId,
    pointsAwarded: pointsToAward,
    transactionType: "sign_in",
  });

  // Create scratch-off ticket
  const ticketId = await createScratchOffTicket(userId);

  return { alreadyEarnedToday: false, points: pointsToAward, ticketId };
}

// ============ SCRATCH-OFF TICKETS ============

/**
 * Create a new scratch-off ticket with random prize
 * 70% chance: loyalty points (50-500)
 * 30% chance: drawing entry (1-5 entries)
 */
export async function createScratchOffTicket(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Determine prize (70% loyalty points, 30% drawing entry)
  const random = Math.random();
  let prizeType: "loyalty_points" | "drawing_entry";
  let loyaltyPointsReward: number | null = null;
  let drawingEntryCount: number | null = null;

  if (random < 0.7) {
    // 70% chance: loyalty points (50-500)
    prizeType = "loyalty_points";
    loyaltyPointsReward = Math.floor(Math.random() * 450) + 50; // 50-500
  } else {
    // 30% chance: drawing entries (1-5)
    prizeType = "drawing_entry";
    drawingEntryCount = Math.floor(Math.random() * 5) + 1; // 1-5
  }

  const result = await db.insert(scratchOffTickets).values({
    userId,
    ticketNumber,
    prizeType,
    loyaltyPointsReward,
    drawingEntryCount: drawingEntryCount || 1,
    expiresAt,
  });

  return (result as any).insertId || 0;
}

export async function getScratchOffTicket(ticketId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(scratchOffTickets)
    .where(eq(scratchOffTickets.id, ticketId));

  return result[0] || null;
}

/**
 * Reveal/scratch a ticket (user sees the prize)
 */
export async function revealScratchOffTicket(ticketId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticket = await getScratchOffTicket(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.status !== "unrevealed") throw new Error("Ticket already revealed");

  await db
    .update(scratchOffTickets)
    .set({
      status: "revealed",
      revealedAt: new Date(),
    })
    .where(eq(scratchOffTickets.id, ticketId));

  return ticket;
}

/**
 * Claim a scratch-off prize
 */
export async function claimScratchOffPrize(ticketId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticket = await getScratchOffTicket(ticketId);
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.status !== "revealed") throw new Error("Ticket must be revealed first");

  // Mark as claimed
  await db
    .update(scratchOffTickets)
    .set({
      status: "claimed",
      claimedAt: new Date(),
    })
    .where(eq(scratchOffTickets.id, ticketId));

  // Award prize
  if (ticket.prizeType === "loyalty_points" && ticket.loyaltyPointsReward) {
    // Add loyalty points
    const loyaltyRecord = await getLoyaltyPoints(ticket.userId);
    await db
      .update(loyaltyPoints)
      .set({
        totalPoints: (loyaltyRecord?.totalPoints || 0) + ticket.loyaltyPointsReward,
        totalPointsEarned: (loyaltyRecord?.totalPointsEarned || 0) + ticket.loyaltyPointsReward,
      })
      .where(eq(loyaltyPoints.userId, ticket.userId));

    // Create audit record
    await db.insert(loyaltyPointsAudit).values({
      userId: ticket.userId,
      pointsAwarded: ticket.loyaltyPointsReward,
      transactionType: "scratch_off_win",
      scratchOffTicketId: ticketId,
    });
  } else if (ticket.prizeType === "drawing_entry") {
    // Add drawing entry
    const currentWeek = getWeekString(new Date());
    await db.insert(weeklyDrawingEntries).values({
      userId: ticket.userId,
      drawingWeek: currentWeek,
      entryCount: ticket.drawingEntryCount || 1,
      sourceType: "scratch_off",
      sourceId: ticketId,
    });

    // Create audit record
    await db.insert(loyaltyPointsAudit).values({
      userId: ticket.userId,
      pointsAwarded: 0,
      transactionType: "drawing_entry",
      scratchOffTicketId: ticketId,
    });
  }

  return ticket;
}

// ============ WEEKLY DRAWING ENTRIES ============

export async function getWeeklyDrawingEntries(userId: number, week: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(weeklyDrawingEntries)
    .where(
      eq(weeklyDrawingEntries.userId, userId) &&
      eq(weeklyDrawingEntries.drawingWeek, week)
    );

  return result;
}

export async function getTotalWeeklyEntries(userId: number, week: string) {
  const db = await getDb();
  if (!db) return 0;

  const entries = await getWeeklyDrawingEntries(userId, week);
  return entries.reduce((total, entry) => total + entry.entryCount, 0);
}

/**
 * Get current week string (e.g., "2026-W22")
 */
export function getWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
