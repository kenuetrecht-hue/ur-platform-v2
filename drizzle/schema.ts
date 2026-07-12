import { int, mysqlTable, text, timestamp, varchar, boolean, decimal, mysqlEnum, unique } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Terms of Service versions for audit trail.
 * Stores all versions of terms with effective dates for legal compliance.
 */
export const termsVersions = mysqlTable("termsVersions", {
  id: int("id").autoincrement().primaryKey(),
  version: varchar("version", { length: 20 }).notNull().unique(), // e.g., "1.0", "1.1"
  title: varchar("title", { length: 255 }).notNull(), // e.g., "Terms of Use", "Creator Agreement"
  type: mysqlEnum("type", ["user", "creator", "payment"]).notNull(), // User signup, Creator onboarding, Payment terms
  content: text("content").notNull(), // Full terms text
  effectiveDate: timestamp("effectiveDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TermsVersion = typeof termsVersions.$inferSelect;
export type InsertTermsVersion = typeof termsVersions.$inferInsert;

/**
 * User terms acceptance audit trail.
 * Records when each user accepted specific terms versions for legal protection.
 */
export const termsAcceptance = mysqlTable("termsAcceptance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  termsVersionId: int("termsVersionId").notNull(),
  type: mysqlEnum("type", ["user", "creator", "payment"]).notNull(),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"), // Browser/device info
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TermsAcceptance = typeof termsAcceptance.$inferSelect;
export type InsertTermsAcceptance = typeof termsAcceptance.$inferInsert;

/**
 * KYC (Know Your Customer) Verification
 * Tracks 18+ age verification, government ID, and facial recognition status
 */
export const kycVerification = mysqlTable("kycVerification", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Age verification
  ageVerified: boolean("ageVerified").default(false).notNull(),
  ageVerifiedAt: timestamp("ageVerifiedAt"),
  
  // Government ID verification
  idVerificationStatus: mysqlEnum("idVerificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  idFrontUrl: varchar("idFrontUrl", { length: 512 }), // S3 URL
  idBackUrl: varchar("idBackUrl", { length: 512 }), // S3 URL
  idVerificationId: varchar("idVerificationId", { length: 255 }), // Jumio/IDology reference ID
  idVerifiedAt: timestamp("idVerifiedAt"),
  
  // Facial recognition (selfie)
  facialVerificationStatus: mysqlEnum("facialVerificationStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  selfieUrl: varchar("selfieUrl", { length: 512 }), // S3 URL
  facialMatchConfidence: decimal("facialMatchConfidence", { precision: 5, scale: 2 }), // 0-100 percentage
  facialVerificationId: varchar("facialVerificationId", { length: 255 }), // Jumio/IDology reference ID
  facialVerifiedAt: timestamp("facialVerifiedAt"),
  
  // Email verification
  emailVerified: boolean("emailVerified").default(false).notNull(),
  emailVerificationToken: varchar("emailVerificationToken", { length: 255 }),
  emailVerificationTokenExpiresAt: timestamp("emailVerificationTokenExpiresAt"),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  
  // Overall KYC status
  kycStatus: mysqlEnum("kycStatus", ["pending", "verified", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KycVerification = typeof kycVerification.$inferSelect;
export type InsertKycVerification = typeof kycVerification.$inferInsert;

/**
 * Email Verification Audit Trail
 * Tracks all email verification attempts for compliance
 */
export const emailVerificationAudit = mysqlTable("emailVerificationAudit", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["sent", "verified", "expired"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  verifiedAt: timestamp("verifiedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailVerificationAudit = typeof emailVerificationAudit.$inferSelect;
export type InsertEmailVerificationAudit = typeof emailVerificationAudit.$inferInsert;

/**
 * Launch Promotion Tiers (300-User Hierarchy)
 * Auto-assigns users to promotional tiers based on registration order
 */
export const launchPromotionTiers = mysqlTable("launchPromotionTiers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  registrationIndex: int("registrationIndex").notNull(), // 1-300 for launch phase
  tier: mysqlEnum("tier", ["tier_1", "tier_2", "tier_3"]).notNull(),
  
  // Tier 1: Users 1-100
  // - 50% OFF 6 months
  // - 2 lifetime drawing entries
  // - 24-hour zero-tax window
  
  // Tier 2: Users 101-200
  // - 60% OFF 90 days
  // - 24-hour zero-tax window
  
  // Tier 3: Users 201-300
  // - 50% OFF 30 days
  // - 24-hour zero-tax window
  
  // Promotion metadata
  tier1DiscountPercentage: decimal("tier1DiscountPercentage", { precision: 5, scale: 2 }), // 50.00
  tier1DiscountDurationDays: int("tier1DiscountDurationDays"), // 180
  tier2DiscountPercentage: decimal("tier2DiscountPercentage", { precision: 5, scale: 2 }), // 60.00
  tier2DiscountDurationDays: int("tier2DiscountDurationDays"), // 90
  tier3DiscountPercentage: decimal("tier3DiscountPercentage", { precision: 5, scale: 2 }), // 50.00
  tier3DiscountDurationDays: int("tier3DiscountDurationDays"), // 30
  
  // Lifetime drawing entries (Tier 1 only)
  lifetimeDrawingEntries: int("lifetimeDrawingEntries").default(0).notNull(), // 2 for Tier 1, 0 for others
  
  // Genesis Clock (24-hour zero-tax window)
  genesisClock24HourStartTime: timestamp("genesisClock24HourStartTime").notNull(), // Exact registration time
  genesisClock24HourEndTime: timestamp("genesisClock24HourEndTime").notNull(), // Start + 24 hours
  genesisClock24HourActive: boolean("genesisClock24HourActive").default(true).notNull(),
  
  // Free Day of Service (Surfer promotion)
  freeDayOfServiceActive: boolean("freeDayOfServiceActive").default(true).notNull(),
  freeDayOfServiceExpiresAt: timestamp("freeDayOfServiceExpiresAt").notNull(), // Day 31 of launch
  
  // Discount activation
  discountStartDate: timestamp("discountStartDate").notNull(),
  discountEndDate: timestamp("discountEndDate").notNull(),
  discountActive: boolean("discountActive").default(true).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LaunchPromotionTier = typeof launchPromotionTiers.$inferSelect;
export type InsertLaunchPromotionTier = typeof launchPromotionTiers.$inferInsert;

/**
 * Platform Fee Tracking
 * Tracks platform fee percentages and promotions per user
 */
export const platformFeeTracking = mysqlTable("platformFeeTracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Current fee percentage
  currentPlatformFeePercentage: decimal("currentPlatformFeePercentage", { precision: 5, scale: 2 }).default("15.00").notNull(), // Default 15%
  
  // Genesis Clock (24-hour zero-tax)
  genesisClock24HourActive: boolean("genesisClock24HourActive").default(false).notNull(),
  genesisClock24HourEndTime: timestamp("genesisClock24HourEndTime"),
  
  // Active promotion
  activePromotionTier: mysqlEnum("activePromotionTier", ["tier_1", "tier_2", "tier_3", "none"]).default("none").notNull(),
  promotionDiscountPercentage: decimal("promotionDiscountPercentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  promotionEndDate: timestamp("promotionEndDate"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformFeeTracking = typeof platformFeeTracking.$inferSelect;
export type InsertPlatformFeeTracking = typeof platformFeeTracking.$inferInsert;

/**
 * Drizzle relations for foreign keys
 */
export const termsAcceptanceRelations = relations(termsAcceptance, ({ one }) => ({
  user: one(users, {
    fields: [termsAcceptance.userId],
    references: [users.id],
  }),
  termsVersion: one(termsVersions, {
    fields: [termsAcceptance.termsVersionId],
    references: [termsVersions.id],
  }),
}));

export const kycVerificationRelations = relations(kycVerification, ({ one }) => ({
  user: one(users, {
    fields: [kycVerification.userId],
    references: [users.id],
  }),
}));

export const emailVerificationAuditRelations = relations(emailVerificationAudit, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationAudit.userId],
    references: [users.id],
  }),
}));

export const launchPromotionTiersRelations = relations(launchPromotionTiers, ({ one }) => ({
  user: one(users, {
    fields: [launchPromotionTiers.userId],
    references: [users.id],
  }),
}));

export const platformFeeTrackingRelations = relations(platformFeeTracking, ({ one }) => ({
  user: one(users, {
    fields: [platformFeeTracking.userId],
    references: [users.id],
  }),
}));

/**
 * User Loyalty Points
 * Tracks cumulative loyalty points earned through daily sign-ins
 * Points awarded for life as long as user participates
 */
export const loyaltyPoints = mysqlTable("loyaltyPoints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Total accumulated points
  totalPoints: int("totalPoints").default(0).notNull(),
  
  // Points earned today (for tracking daily bonus)
  pointsEarnedToday: int("pointsEarnedToday").default(0).notNull(),
  lastEarnedDate: timestamp("lastEarnedDate"),
  
  // Lifetime statistics
  totalSignIns: int("totalSignIns").default(0).notNull(),
  totalPointsEarned: int("totalPointsEarned").default(0).notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = typeof loyaltyPoints.$inferInsert;

/**
 * Loyalty Points Audit Trail
 * Records every sign-in and points awarded for transparency
 */
export const loyaltyPointsAudit = mysqlTable("loyaltyPointsAudit", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Points transaction
  pointsAwarded: int("pointsAwarded").notNull(), // 200 per sign-in
  transactionType: mysqlEnum("transactionType", ["sign_in", "scratch_off_win", "drawing_entry", "admin_adjustment"]).notNull(),
  
  // Related scratch-off ticket (if applicable)
  scratchOffTicketId: int("scratchOffTicketId"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LoyaltyPointsAudit = typeof loyaltyPointsAudit.$inferSelect;
export type InsertLoyaltyPointsAudit = typeof loyaltyPointsAudit.$inferInsert;

/**
 * Scratch-Off Tickets
 * Digital scratch-off tickets awarded with daily sign-in
 * Users scratch to reveal prize (loyalty points or drawing entry)
 */
export const scratchOffTickets = mysqlTable("scratchOffTickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Ticket metadata
  ticketNumber: varchar("ticketNumber", { length: 32 }).notNull().unique(), // Unique ticket ID
  status: mysqlEnum("status", ["unrevealed", "revealed", "claimed"]).default("unrevealed").notNull(),
  
  // Prize type (determined at creation, hidden until revealed)
  prizeType: mysqlEnum("prizeType", ["loyalty_points", "drawing_entry"]).notNull(),
  
  // Prize details
  loyaltyPointsReward: int("loyaltyPointsReward"), // If prizeType = loyalty_points (50-500 points)
  drawingEntryCount: int("drawingEntryCount").default(1), // If prizeType = drawing_entry (1-5 entries)
  
  // Scratch-off state
  revealedAt: timestamp("revealedAt"),
  claimedAt: timestamp("claimedAt"),
  
  // Expiration (tickets expire after 30 days if not claimed)
  expiresAt: timestamp("expiresAt").notNull(),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScratchOffTicket = typeof scratchOffTickets.$inferSelect;
export type InsertScratchOffTicket = typeof scratchOffTickets.$inferInsert;

/**
 * Weekly Drawing Entries
 * Tracks entries for weekly prize drawings
 * Users can win entries through scratch-off tickets or promotions
 */
export const weeklyDrawingEntries = mysqlTable("weeklyDrawingEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Drawing metadata
  drawingWeek: varchar("drawingWeek", { length: 10 }).notNull(), // e.g., "2026-W22"
  entryCount: int("entryCount").default(1).notNull(),
  
  // Entry sources
  sourceType: mysqlEnum("sourceType", ["scratch_off", "tier_1_lifetime", "promotion", "admin"]).notNull(),
  sourceId: int("sourceId"), // Reference to scratch-off ticket or promotion
  
  // Drawing results
  isWinner: boolean("isWinner").default(false).notNull(),
  prizeDescription: text("prizeDescription"), // What they won
  claimedAt: timestamp("claimedAt"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyDrawingEntry = typeof weeklyDrawingEntries.$inferSelect;
export type InsertWeeklyDrawingEntry = typeof weeklyDrawingEntries.$inferInsert;

/**
 * Drizzle relations for loyalty system
 */
export const loyaltyPointsRelations = relations(loyaltyPoints, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyPoints.userId],
    references: [users.id],
  }),
}));

export const loyaltyPointsAuditRelations = relations(loyaltyPointsAudit, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyPointsAudit.userId],
    references: [users.id],
  }),
  scratchOffTicket: one(scratchOffTickets, {
    fields: [loyaltyPointsAudit.scratchOffTicketId],
    references: [scratchOffTickets.id],
  }),
}));

export const scratchOffTicketsRelations = relations(scratchOffTickets, ({ one }) => ({
  user: one(users, {
    fields: [scratchOffTickets.userId],
    references: [users.id],
  }),
}));

export const weeklyDrawingEntriesRelations = relations(weeklyDrawingEntries, ({ one }) => ({
  user: one(users, {
    fields: [weeklyDrawingEntries.userId],
    references: [users.id],
  }),
}));
