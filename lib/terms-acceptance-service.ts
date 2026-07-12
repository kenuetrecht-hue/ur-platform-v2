/**
 * Terms Acceptance Service
 * Manages terms version tracking and user acceptance audit trail
 * Provides legal protection with timestamped proof of user agreement
 */

import { getDb } from "@/server/db";
import { termsVersions, termsAcceptance } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface TermsAcceptanceRecord {
  id: number;
  userId: number;
  termsVersionId: number;
  type: "user" | "creator" | "payment";
  acceptedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface TermsVersionRecord {
  id: number;
  version: string;
  title: string;
  type: "user" | "creator" | "payment";
  content: string;
  effectiveDate: Date;
  createdAt: Date;
}

/**
 * Get the latest version of terms by type
 */
export async function getLatestTermsVersion(
  type: "user" | "creator" | "payment"
): Promise<TermsVersionRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db
      .select()
      .from(termsVersions)
      .where(eq(termsVersions.type, type))
      .orderBy((t: any) => t.effectiveDate)
      .limit(1);

    return result[0] as TermsVersionRecord || null;
  } catch (error) {
    console.error("Error fetching latest terms version:", error);
    return null;
  }
}

/**
 * Record user acceptance of terms
 * Creates audit trail with timestamp, IP, and user agent
 */
export async function recordTermsAcceptance(
  userId: number,
  termsVersionId: number,
  type: "user" | "creator" | "payment",
  ipAddress?: string,
  userAgent?: string
): Promise<TermsAcceptanceRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db.insert(termsAcceptance).values({
      userId,
      termsVersionId,
      type,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    const insertId = Array.isArray(result) ? result[0] : (result as any).insertId;
    
    const inserted = await db
      .select()
      .from(termsAcceptance)
      .where(eq(termsAcceptance.id, insertId as number))
      .limit(1);

    return (inserted[0] as TermsAcceptanceRecord) || null;
  } catch (error) {
    console.error("Error recording terms acceptance:", error);
    return null;
  }
}

/**
 * Check if user has accepted specific terms version
 */
export async function hasUserAcceptedTerms(
  userId: number,
  termsVersionId: number,
  type: "user" | "creator" | "payment"
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const result = await db
      .select()
      .from(termsAcceptance)
      .where(
        and(
          eq(termsAcceptance.userId, userId),
          eq(termsAcceptance.termsVersionId, termsVersionId),
          eq(termsAcceptance.type, type)
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("Error checking terms acceptance:", error);
    return false;
  }
}

/**
 * Get all acceptance records for a user
 */
export async function getUserTermsAcceptanceHistory(
  userId: number
): Promise<TermsAcceptanceRecord[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    
    const result = await db
      .select()
      .from(termsAcceptance)
      .where(eq(termsAcceptance.userId, userId))
      .orderBy((t: any) => t.acceptedAt);

    return result as TermsAcceptanceRecord[];
  } catch (error) {
    console.error("Error fetching user terms history:", error);
    return [];
  }
}

/**
 * Get acceptance record for specific terms type
 */
export async function getLatestUserAcceptance(
  userId: number,
  type: "user" | "creator" | "payment"
): Promise<TermsAcceptanceRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db
      .select()
      .from(termsAcceptance)
      .where(
        and(
          eq(termsAcceptance.userId, userId),
          eq(termsAcceptance.type, type)
        )
      )
      .orderBy((t: any) => t.acceptedAt)
      .limit(1);

    return (result[0] as TermsAcceptanceRecord) || null;
  } catch (error) {
    console.error("Error fetching latest user acceptance:", error);
    return null;
  }
}

/**
 * Create a new terms version
 */
export async function createTermsVersion(
  version: string,
  title: string,
  type: "user" | "creator" | "payment",
  content: string,
  effectiveDate: Date
): Promise<TermsVersionRecord | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db.insert(termsVersions).values({
      version,
      title,
      type,
      content,
      effectiveDate,
    });

    const insertId = Array.isArray(result) ? result[0] : (result as any).insertId;
    
    const inserted = await db
      .select()
      .from(termsVersions)
      .where(eq(termsVersions.id, insertId as number))
      .limit(1);

    return (inserted[0] as TermsVersionRecord) || null;
  } catch (error) {
    console.error("Error creating terms version:", error);
    return null;
  }
}

/**
 * Get all versions of terms by type
 */
export async function getTermsVersionHistory(
  type: "user" | "creator" | "payment"
): Promise<TermsVersionRecord[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    
    const result = await db
      .select()
      .from(termsVersions)
      .where(eq(termsVersions.type, type))
      .orderBy((t: any) => t.effectiveDate);

    return result as TermsVersionRecord[];
  } catch (error) {
    console.error("Error fetching terms version history:", error);
    return [];
  }
}

/**
 * Verify user accepted terms before specific date
 */
export async function verifyTermsAcceptanceBeforeDate(
  userId: number,
  type: "user" | "creator" | "payment",
  beforeDate: Date
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const result = await db
      .select()
      .from(termsAcceptance)
      .where(
        and(
          eq(termsAcceptance.userId, userId),
          eq(termsAcceptance.type, type)
        )
      )
      .orderBy((t: any) => t.acceptedAt)
      .limit(1);

    if (result.length === 0) return false;
    return result[0].acceptedAt <= beforeDate;
  } catch (error) {
    console.error("Error verifying terms acceptance:", error);
    return false;
  }
}

/**
 * Get acceptance statistics
 */
export async function getAcceptanceStatistics(): Promise<{
  userAcceptances: number;
  creatorAcceptances: number;
  paymentAcceptances: number;
  totalAcceptances: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        userAcceptances: 0,
        creatorAcceptances: 0,
        paymentAcceptances: 0,
        totalAcceptances: 0,
      };
    }
    
    const result = await db.select().from(termsAcceptance);

    return {
      userAcceptances: result.filter((r: any) => r.type === "user").length,
      creatorAcceptances: result.filter((r: any) => r.type === "creator").length,
      paymentAcceptances: result.filter((r: any) => r.type === "payment").length,
      totalAcceptances: result.length,
    };
  } catch (error) {
    console.error("Error fetching acceptance statistics:", error);
    return {
      userAcceptances: 0,
      creatorAcceptances: 0,
      paymentAcceptances: 0,
      totalAcceptances: 0,
    };
  }
}
