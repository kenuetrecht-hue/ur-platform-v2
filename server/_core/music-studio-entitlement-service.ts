import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  getMusicStudioPlan,
  quoteMusicStudio,
  type MusicStudioPlanId,
} from "../../lib/music-studio-pricing";

export type MusicStudioLot = {
  id: string;
  userId: string;
  planId: MusicStudioPlanId;
  exportsRemaining: number;
  vocalTakesRemaining: number;
  purchasedAt: string;
  expiresAt: string;
};

const lots = new Map<string, MusicStudioLot[]>();

export function _resetMusicStudioEntitlementsForTests(): void {
  lots.clear();
}

function nowMs(): number {
  return Date.now();
}

function activeLots(userId: string, at = nowMs()): MusicStudioLot[] {
  return (lots.get(userId) ?? []).filter((lot) => new Date(lot.expiresAt).getTime() > at);
}

export function getMusicStudioStatus(
  userId: string,
  isPlatformOwner = false,
): {
  complimentary: boolean;
  hasPro: boolean;
  exportsRemaining: number;
  vocalTakesRemaining: number;
  expiresAt: string | null;
  lots: MusicStudioLot[];
} {
  if (isPlatformOwner) {
    return {
      complimentary: true,
      hasPro: true,
      exportsRemaining: 99_999,
      vocalTakesRemaining: 99_999,
      expiresAt: null,
      lots: [],
    };
  }
  const open = activeLots(userId);
  return {
    complimentary: false,
    hasPro: open.length > 0,
    exportsRemaining: open.reduce((sum, lot) => sum + lot.exportsRemaining, 0),
    vocalTakesRemaining: open.reduce((sum, lot) => sum + lot.vocalTakesRemaining, 0),
    expiresAt:
      open.length > 0
        ? open.reduce((earliest, lot) => (lot.expiresAt < earliest ? lot.expiresAt : earliest), open[0]!.expiresAt)
        : null,
    lots: open,
  };
}

export function assertMusicStudioPro(userId: string, isPlatformOwner: boolean): void {
  if (getMusicStudioStatus(userId, isPlatformOwner).hasPro) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Buy UR Studio Pro (Session $2.99, Month $9.99, or Year $79.99) to use the mixer, extra tracks, export, and vocal take.",
  });
}

export function purchaseMusicStudioPlan(input: {
  userId: string;
  planId: MusicStudioPlanId;
  isPlatformOwner?: boolean;
}): { lot: MusicStudioLot | null; status: ReturnType<typeof getMusicStudioStatus> } {
  quoteMusicStudio(input.planId);
  if (input.isPlatformOwner) {
    return { lot: null, status: getMusicStudioStatus(input.userId, true) };
  }
  const plan = getMusicStudioPlan(input.planId);
  const purchasedAt = new Date();
  const expiresAt = new Date(purchasedAt.getTime() + plan.days * 24 * 60 * 60 * 1000);
  const lot: MusicStudioLot = {
    id: randomUUID(),
    userId: input.userId,
    planId: input.planId,
    exportsRemaining: plan.exports,
    vocalTakesRemaining: plan.vocalTakes,
    purchasedAt: purchasedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  const next = [...(lots.get(input.userId) ?? []), lot];
  lots.set(input.userId, next);
  return { lot, status: getMusicStudioStatus(input.userId, false) };
}

function consumeFromLots(
  userId: string,
  field: "exportsRemaining" | "vocalTakesRemaining",
  emptyMessage: string,
): void {
  const open = activeLots(userId).sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));
  const lot = open.find((item) => item[field] > 0);
  if (!lot) {
    throw new TRPCError({ code: "FORBIDDEN", message: emptyMessage });
  }
  lot[field] -= 1;
}

export function consumeMusicExport(userId: string, isPlatformOwner: boolean): ReturnType<typeof getMusicStudioStatus> {
  if (isPlatformOwner) return getMusicStudioStatus(userId, true);
  assertMusicStudioPro(userId, false);
  consumeFromLots(userId, "exportsRemaining", "No WAV exports left on this Pro lot. Buy another Session, Month, or Year.");
  return getMusicStudioStatus(userId, false);
}

export function consumeMusicVocalTake(userId: string, isPlatformOwner: boolean): ReturnType<typeof getMusicStudioStatus> {
  if (isPlatformOwner) return getMusicStudioStatus(userId, true);
  assertMusicStudioPro(userId, false);
  consumeFromLots(userId, "vocalTakesRemaining", "No vocal takes left on this Pro lot. Buy another Session, Month, or Year.");
  return getMusicStudioStatus(userId, false);
}
