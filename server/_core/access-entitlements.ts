/**
 * Server-side access control — single source of truth for who may use paid features.
 * Platform owner: full access always.
 * Others: active membership OR owner-granted free access OR payment required.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { isOwnerEmail } from "./owner-auth";
import { ENV } from "./env";
import { hasActiveAiSubscription, getActiveAiSubscription } from "./ai-subscription-service";
import { hasLoyaltyTextAccess } from "./loyalty-streak-service";

export type AccessSource = "owner" | "owner_grant" | "membership" | "ai_subscription" | "loyalty" | "none";

export type PlatformFeature = "ai_chat" | "ai_learn" | "ai_hive" | "ai_sandbox";

export type AccessGrant = {
  id: string;
  userEmail: string;
  userId?: string;
  reason?: string;
  features: PlatformFeature[];
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  grantedBy: "platform_owner";
};

export type PaidMembership = {
  id: string;
  userId: string;
  userEmail: string;
  plan: "day" | "week" | "month" | "year";
  startedAt: string;
  expiresAt: string;
  source: "stripe" | "manual";
  active: boolean;
};

const grantStore = new Map<string, AccessGrant>();
const membershipStore = new Map<string, PaidMembership>();

const ALL_FEATURES: PlatformFeature[] = ["ai_chat", "ai_learn", "ai_hive", "ai_sandbox"];

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isGrantActive(grant: AccessGrant, now = Date.now()): boolean {
  if (grant.revokedAt) return false;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < now) return false;
  return true;
}

function findActiveGrant(
  userId: string | number | undefined,
  email: string | null | undefined,
): AccessGrant | null {
  const normalized = email ? normalizeEmail(email) : null;
  for (const grant of grantStore.values()) {
    if (!isGrantActive(grant)) continue;
    if (normalized && normalizeEmail(grant.userEmail) === normalized) return grant;
    if (userId != null && grant.userId === String(userId)) return grant;
  }
  return null;
}

function findActiveMembership(
  userId: string | number | undefined,
  email: string | null | undefined,
): PaidMembership | null {
  const now = Date.now();
  for (const m of membershipStore.values()) {
    if (!m.active) continue;
    if (new Date(m.expiresAt).getTime() < now) continue;
    if (userId != null && m.userId === String(userId)) return m;
    if (email && normalizeEmail(m.userEmail) === normalizeEmail(email)) return m;
  }
  return null;
}

export type AccessStatus = {
  hasAiAccess: boolean;
  source: AccessSource;
  grantId?: string;
  grantExpiresAt?: string;
  membershipPlan?: string;
  membershipExpiresAt?: string;
  aiSubscriptionPlan?: string;
  aiSubscriptionExpiresAt?: string;
};

export function getAccessStatus(params: {
  userId?: string | number | null;
  email?: string | null;
  isPlatformOwner: boolean;
}): AccessStatus {
  if (params.isPlatformOwner) {
    return { hasAiAccess: true, source: "owner" };
  }

  const grant = findActiveGrant(params.userId ?? undefined, params.email);
  if (grant) {
    return {
      hasAiAccess: true,
      source: "owner_grant",
      grantId: grant.id,
      grantExpiresAt: grant.expiresAt,
    };
  }

  const membership = findActiveMembership(params.userId ?? undefined, params.email);
  if (membership) {
    return {
      hasAiAccess: true,
      source: "membership",
      membershipPlan: membership.plan,
      membershipExpiresAt: membership.expiresAt,
    };
  }

  return { hasAiAccess: false, source: "none" };
}

/** Throws FORBIDDEN if user lacks entitlement. Owner always passes. */
export function assertAiEntitled(params: {
  userId?: string | number | null;
  email?: string | null;
  isPlatformOwner: boolean;
  feature?: PlatformFeature;
  /** When set, per-AI subscription to this specialist also grants access. */
  creatorId?: string;
}): AccessStatus {
  if (params.isPlatformOwner) {
    return { hasAiAccess: true, source: "owner" };
  }

  if (params.userId != null && !ENV.isProduction) {
    return { hasAiAccess: true, source: "owner_grant" };
  }

  if (params.userId == null && !params.email) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to use AI specialists, or purchase access.",
    });
  }

  const status = getAccessStatus(params);

  if (!status.hasAiAccess && params.creatorId && params.userId != null) {
    const uid = String(params.userId);
    if (hasActiveAiSubscription(uid, params.email, params.creatorId)) {
      const sub = getActiveAiSubscription(uid, params.creatorId);
      return {
        hasAiAccess: true,
        source: "ai_subscription",
        aiSubscriptionPlan: sub?.plan,
        aiSubscriptionExpiresAt: sub?.expiresAt,
      };
    }
    if (hasLoyaltyTextAccess(uid, params.creatorId)) {
      return { hasAiAccess: true, source: "loyalty" };
    }
  }

  if (!status.hasAiAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: params.creatorId
        ? "Buy a day, week, or month text pass to talk to UR specialists — one AI at a time — or use loyalty points for simple text chat."
        : "AI access requires a membership or subscription. Contact the platform owner if you were offered complimentary access.",
    });
  }

  const grant = status.grantId ? grantStore.get(status.grantId) : null;
  if (grant && params.feature && !grant.features.includes(params.feature)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your complimentary access does not include this feature.",
    });
  }

  return status;
}

/** Owner-only: grant free AI access to a user by email. */
export function grantFreeAccessByOwner(params: {
  userEmail: string;
  userId?: string;
  reason?: string;
  expiresAt?: string;
  features?: PlatformFeature[];
}): AccessGrant {
  const email = normalizeEmail(params.userEmail);
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email required." });
  }

  if (isOwnerEmail(email)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Platform owner already has full access.",
    });
  }

  for (const [id, grant] of grantStore) {
    if (isGrantActive(grant) && normalizeEmail(grant.userEmail) === email) {
      grantStore.delete(id);
    }
  }

  const grant: AccessGrant = {
    id: `grant-${randomUUID().slice(0, 12)}`,
    userEmail: email,
    userId: params.userId,
    reason: params.reason?.slice(0, 500),
    features: params.features?.length ? params.features : ALL_FEATURES,
    grantedAt: new Date().toISOString(),
    expiresAt: params.expiresAt,
    grantedBy: "platform_owner",
  };

  grantStore.set(grant.id, grant);
  return grant;
}

export function revokeAccessGrant(grantId: string): AccessGrant {
  const grant = grantStore.get(grantId);
  if (!grant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found." });
  }
  grant.revokedAt = new Date().toISOString();
  grantStore.set(grantId, grant);
  return grant;
}

export function listAccessGrants(includeRevoked = false): AccessGrant[] {
  return Array.from(grantStore.values())
    .filter((g) => includeRevoked || isGrantActive(g) || !g.revokedAt)
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
}

/** Record paid membership (Stripe webhook / manual). */
export function recordPaidMembership(params: {
  userId: string;
  userEmail: string;
  plan: PaidMembership["plan"];
  durationDays: number;
  source?: PaidMembership["source"];
}): PaidMembership {
  const now = new Date();
  const expires = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000);
  const membership: PaidMembership = {
    id: `mem-${randomUUID().slice(0, 12)}`,
    userId: params.userId,
    userEmail: normalizeEmail(params.userEmail),
    plan: params.plan,
    startedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    source: params.source ?? "stripe",
    active: true,
  };
  membershipStore.set(membership.id, membership);
  return membership;
}

export function listActiveMemberships(): PaidMembership[] {
  const now = Date.now();
  return Array.from(membershipStore.values()).filter(
    (m) => m.active && new Date(m.expiresAt).getTime() >= now,
  );
}
