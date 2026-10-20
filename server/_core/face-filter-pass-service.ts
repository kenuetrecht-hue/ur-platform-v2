import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { FACE_FILTERS } from "../../lib/face-filters";
import {
  FACE_FILTER_AI_NAME,
  FACE_FILTER_MONTH_CENTS,
  FACE_FILTER_PRICE_NOTE,
  FACE_FILTER_WEEK_CENTS,
  faceFilterPlanCents,
  faceFilterPlanLabel,
  type FaceFilterPlanId,
} from "../../lib/face-filter-pricing";
import { faceFilterWeekEndsAt, weeklyFaceSet } from "../../lib/face-filter-week";
import { loadFaceFilterPasses, persistFaceFilterPass } from "./face-filter-pass-persistence";
import { userHasActivePaidChannel } from "./creator-audience-service";

type Pass = {
  id: string;
  userId: string;
  planId: FaceFilterPlanId;
  expiresAt: string;
};

const passes = new Map<string, Pass[]>();

export function _resetFaceFilterPassesForTests(): void {
  passes.clear();
}

function remember(pass: Pass): void {
  const list = passes.get(pass.userId) ?? [];
  if (!list.some((row) => row.id === pass.id)) list.push(pass);
  passes.set(pass.userId, list);
}

export function grantFaceFilterPass(params: {
  userId: string;
  planId: FaceFilterPlanId;
  at?: Date;
}): Pass {
  if (params.planId !== "week" && params.planId !== "month") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick this week or 30 days." });
  }
  const at = params.at ?? new Date();
  const expiresAt =
    params.planId === "week"
      ? faceFilterWeekEndsAt(at)
      : new Date(at.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const pass: Pass = {
    id: randomUUID(),
    userId: params.userId,
    planId: params.planId,
    expiresAt,
  };
  remember(pass);
  void persistFaceFilterPass(pass);
  return pass;
}

export function faceFiltersUnlocked(userId: string, isPlatformOwner: boolean, at = new Date()): boolean {
  if (isPlatformOwner) return true;
  const now = at.getTime();
  if ((passes.get(userId) ?? []).some((pass) => new Date(pass.expiresAt).getTime() > now)) return true;
  return userHasActivePaidChannel(userId, now);
}

export async function faceFilterCatalog(userId: string, isPlatformOwner: boolean) {
  const stored = await loadFaceFilterPasses(userId);
  for (const row of stored) {
    if (row.planId === "week" || row.planId === "month") {
      remember({ id: row.id, userId: row.userId, planId: row.planId, expiresAt: row.expiresAt });
    }
  }
  const set = weeklyFaceSet();
  const unlocked = faceFiltersUnlocked(userId, isPlatformOwner);
  return {
    note: FACE_FILTER_PRICE_NOTE,
    aiName: FACE_FILTER_AI_NAME,
    weekId: set.weekId,
    setName: set.name,
    unlocked,
    weekCents: FACE_FILTER_WEEK_CENTS,
    monthCents: FACE_FILTER_MONTH_CENTS,
    weekLabel: faceFilterPlanLabel("week"),
    monthLabel: faceFilterPlanLabel("month"),
    free: FACE_FILTERS.map((filter) => ({ id: filter.id, label: filter.label, emoji: filter.emoji })),
    looks: set.looks.map((look) =>
      unlocked
        ? { id: look.id, label: look.label, emoji: look.emoji, color: look.color, shape: look.shape, locked: false }
        : { id: look.id, label: look.label, emoji: look.emoji, locked: true },
    ),
  };
}

export function assertFaceFilterPlan(planId: string): FaceFilterPlanId {
  if (planId !== "week" && planId !== "month") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick this week or 30 days." });
  }
  return planId;
}

export function faceFilterChargeCents(planId: FaceFilterPlanId): number {
  return faceFilterPlanCents(planId);
}
