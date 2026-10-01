import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  CREATOR_SOCIAL_PUSH_PLANS,
  getCreatorSocialPushPlan,
  type CreatorSocialPushPlanId,
} from "../../lib/creator-social-push-pricing";
import { creatorSocialPushLots } from "../../drizzle/schema";
import { getDb } from "../db";

type PushLot = {
  userId: string;
  planId: CreatorSocialPushPlanId;
  dailyCap: number;
  expiresAt: string;
  day: string;
  usedToday: number;
};

const lots = new Map<string, PushLot>();
let hydrated = false;

function skipPersistence(): boolean {
  return process.env.VITEST === "true" || process.env.NODE_ENV === "test";
}

export function _resetCreatorSocialPushForTests(): void {
  lots.clear();
  hydrated = true;
}

async function ensureCreatorSocialPushTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS creatorSocialPushLots (
      userId varchar(128) NOT NULL,
      planId varchar(16) NOT NULL,
      dailyCap int NOT NULL,
      expiresAt varchar(40) NOT NULL,
      usageDay varchar(10) NOT NULL,
      usedToday int NOT NULL,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (userId)
    )
  `);
}

async function persistLot(lot: PushLot): Promise<void> {
  if (skipPersistence()) return;
  const db = await getDb();
  if (!db) return;
  try {
    await ensureCreatorSocialPushTable(db);
    await db
      .insert(creatorSocialPushLots)
      .values({
        userId: lot.userId,
        planId: lot.planId,
        dailyCap: lot.dailyCap,
        expiresAt: lot.expiresAt,
        usageDay: lot.day,
        usedToday: lot.usedToday,
      })
      .onDuplicateKeyUpdate({
        set: {
          planId: lot.planId,
          dailyCap: lot.dailyCap,
          expiresAt: lot.expiresAt,
          usageDay: lot.day,
          usedToday: lot.usedToday,
        },
      });
  } catch {
    console.warn("[creator-social-push] could not save the plan");
  }
}

/** Loads paid plans from MySQL once per process so a restart does not drop a purchase. */
export async function hydrateCreatorSocialPush(): Promise<void> {
  if (hydrated || skipPersistence()) {
    hydrated = true;
    return;
  }
  hydrated = true;
  const db = await getDb();
  if (!db) return;
  try {
    await ensureCreatorSocialPushTable(db);
    const rows = await db.select().from(creatorSocialPushLots);
    for (const row of rows) {
      const plan = getCreatorSocialPushPlan(row.planId);
      if (!plan) continue;
      lots.set(row.userId, {
        userId: row.userId,
        planId: plan.id,
        dailyCap: row.dailyCap,
        expiresAt: row.expiresAt,
        day: row.usageDay,
        usedToday: row.usedToday,
      });
    }
  } catch {
    console.warn("[creator-social-push] could not load plans");
  }
}

export function creatorSocialPushDay(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Indiana/Indianapolis" });
}

export type CreatorSocialPushStatus = {
  complimentary: boolean;
  active: boolean;
  planId: CreatorSocialPushPlanId | null;
  planLabel: string;
  dailyCap: number;
  usedToday: number;
  remainingToday: number;
  expiresAt: string | null;
  plans: Array<{
    id: CreatorSocialPushPlanId;
    label: string;
    priceDisplay: string;
    dailyCap: number;
    days: number;
    subtotalCents: number;
  }>;
};

function publicPlans(): CreatorSocialPushStatus["plans"] {
  return CREATOR_SOCIAL_PUSH_PLANS.map((plan) => ({
    id: plan.id,
    label: plan.label,
    priceDisplay: plan.priceDisplay,
    dailyCap: plan.dailyCap,
    days: plan.days,
    subtotalCents: plan.subtotalCents,
  }));
}

function liveLot(userId: string, now = new Date()): PushLot | null {
  const lot = lots.get(userId);
  if (!lot) return null;
  if (new Date(lot.expiresAt).getTime() <= now.getTime()) return null;
  const day = creatorSocialPushDay(now);
  if (lot.day !== day) {
    lot.day = day;
    lot.usedToday = 0;
  }
  return lot;
}

export function getCreatorSocialPushStatus(
  userId: string,
  isPlatformOwner = false,
): CreatorSocialPushStatus {
  if (isPlatformOwner) {
    return {
      complimentary: true,
      active: true,
      planId: null,
      planLabel: "Owner",
      dailyCap: 999,
      usedToday: 0,
      remainingToday: 999,
      expiresAt: null,
      plans: publicPlans(),
    };
  }
  const lot = liveLot(userId);
  const plan = lot ? getCreatorSocialPushPlan(lot.planId) : null;
  const dailyCap = lot?.dailyCap ?? 0;
  const usedToday = lot?.usedToday ?? 0;
  return {
    complimentary: false,
    active: Boolean(lot),
    planId: lot?.planId ?? null,
    planLabel: plan?.label ?? "",
    dailyCap,
    usedToday,
    remainingToday: Math.max(0, dailyCap - usedToday),
    expiresAt: lot?.expiresAt ?? null,
    plans: publicPlans(),
  };
}

export function grantCreatorSocialPush(params: {
  userId: string;
  planId: string;
  now?: Date;
}): CreatorSocialPushStatus {
  const plan = getCreatorSocialPushPlan(params.planId);
  if (!plan) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That social push plan is not available." });
  }
  const now = params.now ?? new Date();
  const existing = liveLot(params.userId, now);
  const day = creatorSocialPushDay(now);
  const usedToday = existing && existing.day === day ? existing.usedToday : 0;
  const expires = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);
  const lot: PushLot = {
    userId: params.userId,
    planId: plan.id,
    dailyCap: plan.dailyCap,
    expiresAt: expires.toISOString(),
    day,
    usedToday,
  };
  lots.set(params.userId, lot);
  void persistLot(lot);
  return getCreatorSocialPushStatus(params.userId, false);
}

export function assertCreatorSocialPush(userId: string, isPlatformOwner: boolean): void {
  if (isPlatformOwner) return;
  const status = getCreatorSocialPushStatus(userId, false);
  if (!status.active) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Buy a social push plan before sending posts to other platforms. Starter is $6.99 for 3 posts a day.",
    });
  }
  if (status.usedToday >= status.dailyCap) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You can send ${status.dailyCap} social posts today on the ${status.planLabel} plan. Upgrade for a higher daily cap, or try again tomorrow.`,
    });
  }
}

export function recordCreatorSocialPush(userId: string, isPlatformOwner: boolean): void {
  if (isPlatformOwner) return;
  const lot = liveLot(userId);
  if (!lot) return;
  lot.usedToday += 1;
  void persistLot(lot);
}
