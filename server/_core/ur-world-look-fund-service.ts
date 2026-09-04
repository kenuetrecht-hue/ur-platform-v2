/**
 * Plaza look fund ledger — in-memory until the rest of UR World is persisted.
 * Public board never includes emails or user ids.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { sanitizeUserText } from "./input-sanitize";
import {
  apparelLookFundCutCents,
  getLookFundChipPack,
  UR_WORLD_LOOK_FUND_APPAREL_LINE,
  UR_WORLD_LOOK_FUND_CHIP_PACKS,
  UR_WORLD_LOOK_FUND_NEXT_SCENE_LINE,
  UR_WORLD_LOOK_FUND_PURPOSE,
  UR_WORLD_LOOK_FUND_RECEIPT_LINE,
  UR_WORLD_LOOK_FUND_SHORT,
  UR_WORLD_LOOK_FUND_STAGES,
  type UrWorldLookFundChipId,
  type UrWorldLookFundStageId,
} from "../../lib/ur-world-look-fund";
import {
  buildTipperShareCaption,
  tipperStatusFromCents,
  UR_WORLD_TIP_CHIP_BADGES,
  UR_WORLD_TIPPER_BADGE_LICENSE,
} from "../../lib/ur-world-tipper-badges";
import { UR_WORLD_SHORT_FOOTER, containsForbiddenUrWorldClaim } from "../../lib/ur-world-disclosures";

type FundSource = "tip" | "apparel_cut";

type FundEntry = {
  id: string;
  userId: string;
  displayName: string;
  cents: number;
  source: FundSource;
  createdAt: string;
  packId?: string;
};

type StageCloser = {
  stageId: UrWorldLookFundStageId;
  displayName: string;
  at: string;
  cents: number;
  source: FundSource;
};

export type LookSpendReport = {
  id: string;
  stageId: UrWorldLookFundStageId;
  spentCents: number;
  bought: string;
  upgrade: string;
  at: string;
};

const entries: FundEntry[] = [];
const closers = new Map<UrWorldLookFundStageId, StageCloser>();
const spendReports: LookSpendReport[] = [];
let nextScenePublic = UR_WORLD_LOOK_FUND_NEXT_SCENE_LINE;

function publicThanksName(raw: string | undefined): string {
  const stripped = (raw ?? "").replace(/@\S+/g, " ");
  const clean = sanitizeUserText(stripped, 40);
  const first = clean.split(/\s+/).find((part) => part.length >= 2) ?? "";
  if (!first || /https?:/i.test(first)) return "A member";
  return first.slice(0, 18);
}

function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function raisedCents(): number {
  return entries.reduce((sum, row) => sum + row.cents, 0);
}

function cumulativeTarget(stageId: UrWorldLookFundStageId): number {
  let sum = 0;
  for (const stage of UR_WORLD_LOOK_FUND_STAGES) {
    sum += stage.targetCents;
    if (stage.id === stageId) return sum;
  }
  return sum;
}

function noteClosers(before: number, after: number, entry: FundEntry): void {
  for (const stage of UR_WORLD_LOOK_FUND_STAGES) {
    const threshold = cumulativeTarget(stage.id);
    if (before < threshold && after >= threshold && !closers.has(stage.id)) {
      closers.set(stage.id, {
        stageId: stage.id,
        displayName: entry.displayName,
        at: entry.createdAt,
        cents: entry.cents,
        source: entry.source,
      });
    }
  }
}

function credit(params: {
  userId: string;
  displayName: string;
  cents: number;
  source: FundSource;
  packId?: string;
}): FundEntry {
  if (params.cents <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tip must be more than zero." });
  }
  const entry: FundEntry = {
    id: randomUUID(),
    userId: params.userId,
    displayName: publicThanksName(params.displayName),
    cents: params.cents,
    source: params.source,
    createdAt: new Date().toISOString(),
    packId: params.packId,
  };
  const before = raisedCents();
  entries.push(entry);
  noteClosers(before, before + entry.cents, entry);
  return entry;
}

export function creditApparelCutToLookFund(params: {
  userId: string;
  displayName?: string;
  apparelPriceCents: number;
  packId: string;
}): number {
  const cut = apparelLookFundCutCents(params.apparelPriceCents);
  if (cut <= 0) return 0;
  credit({
    userId: params.userId,
    displayName: params.displayName ?? "A member",
    cents: cut,
    source: "apparel_cut",
    packId: params.packId,
  });
  return cut;
}

export function chipInLookFund(params: {
  userId: string;
  userEmail: string;
  displayName?: string;
  packId: UrWorldLookFundChipId;
}): { creditedCents: number; board: ReturnType<typeof getLookFundBoard> } {
  const pack = getLookFundChipPack(params.packId);
  if (!pack) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown look-fund tip." });
  }
  if (pack.priceCents === 500) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Look-fund tips cannot be priced at exactly $5.00.",
    });
  }
  const entry = credit({
    userId: params.userId,
    displayName: params.displayName ?? "A member",
    cents: pack.priceCents,
    source: "tip",
    packId: pack.id,
  });
  recordTransaction({
    type: "other",
    amountCents: pack.priceCents,
    description: `UR World plaza look tip ${pack.label} — not a charity donation, not tax-deductible`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: { urWorld: true, lookFund: true, packId: pack.id, entryId: entry.id },
  });
  return { creditedCents: pack.priceCents, board: getLookFundBoard(params.userId) };
}

export function getLookFundBoard(viewerUserId?: string) {
  const total = raisedCents();
  let consumed = 0;
  const stages = UR_WORLD_LOOK_FUND_STAGES.map((stage) => {
    const filled = Math.min(stage.targetCents, Math.max(0, total - consumed));
    consumed += stage.targetCents;
    const closer = closers.get(stage.id) ?? null;
    const funded = filled >= stage.targetCents;
    return {
      id: stage.id,
      name: stage.name,
      targetCents: stage.targetCents,
      filledCents: filled,
      remainingCents: Math.max(0, stage.targetCents - filled),
      percent: stage.targetCents === 0 ? 0 : Math.min(100, Math.round((filled / stage.targetCents) * 100)),
      funded,
      rangeLabel: stage.rangeLabel,
      unlocks: stage.unlocks,
      closer: closer
        ? {
            displayName: closer.displayName,
            at: closer.at,
            cents: closer.cents,
            source: closer.source,
          }
        : null,
    };
  });
  const fillingOpen = stages.find((s) => !s.funded);
  const filling = fillingOpen ?? stages[stages.length - 1]!;
  const currentLevelComplete = stages.every((s) => s.funded);
  const stretchCents = Math.max(0, total - UR_WORLD_LOOK_FUND_STAGES.reduce((sum, s) => sum + s.targetCents, 0));

  const thisWeek = isoWeekKey(new Date().toISOString());
  const weekTotals = new Map<string, { displayName: string; cents: number }>();
  for (const row of entries) {
    if (isoWeekKey(row.createdAt) !== thisWeek) continue;
    const prev = weekTotals.get(row.userId) ?? { displayName: row.displayName, cents: 0 };
    prev.cents += row.cents;
    prev.displayName = row.displayName;
    weekTotals.set(row.userId, prev);
  }
  const weeklyTop = [...weekTotals.values()].sort((a, b) => b.cents - a.cents).slice(0, 3);

  return {
    purpose: UR_WORLD_LOOK_FUND_PURPOSE,
    apparelLine: UR_WORLD_LOOK_FUND_APPAREL_LINE,
    short: UR_WORLD_LOOK_FUND_SHORT,
    footer: UR_WORLD_SHORT_FOOTER,
    raisedCents: total,
    stretchCents,
    fillingStageId: filling.id,
    currentLevelComplete,
    nextSceneLine: nextScenePublic,
    stages,
    weeklyTop,
    weekKey: thisWeek,
    chipPacks: UR_WORLD_LOOK_FUND_CHIP_PACKS.map((p) => ({ ...p })),
    receiptLine: UR_WORLD_LOOK_FUND_RECEIPT_LINE,
    spendReports: spendReports.map((row) => ({ ...row })),
    badgeLicense: UR_WORLD_TIPPER_BADGE_LICENSE,
    me: viewerUserId ? getMyTipperCard(viewerUserId) : null,
  };
}

export function getMyTipperCard(userId: string) {
  const mine = entries.filter((row) => row.userId === userId);
  const lifetimeCents = mine.reduce((sum, row) => sum + row.cents, 0);
  const unlockedPackIds = [
    ...new Set(mine.filter((row) => row.source === "tip" && row.packId).map((row) => row.packId!)),
  ];
  const chips = UR_WORLD_TIP_CHIP_BADGES.map((badge) => ({
    ...badge,
    unlocked: unlockedPackIds.includes(badge.packId),
  }));
  const { current, next } = tipperStatusFromCents(lifetimeCents);
  const unlockedNames = chips.filter((c) => c.unlocked).map((c) => c.name);
  const statusName = current?.name ?? "Plaza guest";
  return {
    lifetimeCents,
    status: current,
    next,
    chips,
    shareCaption: current
      ? buildTipperShareCaption({ statusName, unlockedNames })
      : `Tips help grow UR World's Civic Plaza look — not a charity gift, not an investment. https://urplatform.llc/world`,
    license: UR_WORLD_TIPPER_BADGE_LICENSE,
  };
}

export function reportLookSpend(params: {
  stageId: UrWorldLookFundStageId;
  spentCents: number;
  bought: string;
  upgrade: string;
}): LookSpendReport {
  if (params.spentCents < 1 || params.spentCents > 25_000_000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Spend amount is out of range." });
  }
  const bought = sanitizeUserText(params.bought, 160);
  const upgrade = sanitizeUserText(params.upgrade, 160);
  if (bought.length < 8 || upgrade.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Say what the money bought and what upgrade went live (plain English, not a one-word note).",
    });
  }
  const combined = `${bought} ${upgrade}`;
  if (containsForbiddenUrWorldClaim(combined)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That receipt sounds like an investment or charity claim. Say what was bought and what people will see.",
    });
  }
  const report: LookSpendReport = {
    id: randomUUID(),
    stageId: params.stageId,
    spentCents: params.spentCents,
    bought,
    upgrade,
    at: new Date().toISOString(),
  };
  spendReports.unshift(report);
  if (spendReports.length > 12) spendReports.length = 12;
  return report;
}

/** Owner types this in Business Steward or World Director. */
export function tryApplyLookSpendCommand(message: string): string | null {
  const match = message
    .trim()
    .match(
      /^REPORT LOOK SPEND\s+([BCD])\s+(\d+(?:\.\d{1,2})?)\s*\|\s*(.+?)\s*\|\s*(.+)\s*$/i,
    );
  if (!match) return null;
  const stageId = match[1]!.toUpperCase() as UrWorldLookFundStageId;
  const spentCents = Math.round(Number(match[2]) * 100);
  const report = reportLookSpend({
    stageId,
    spentCents,
    bought: match[3] ?? "",
    upgrade: match[4] ?? "",
  });
  return (
    `Posted the Plan ${report.stageId} public receipt: $${(report.spentCents / 100).toFixed(2)} spent on ${report.bought}. ` +
    `Upgrade live: ${report.upgrade}. Members see this on /world. Not a charity report. Not an investment update.`
  );
}

export function setNextLookScene(label: string): string {
  const clean = sanitizeUserText(label, 180);
  if (clean.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Name the next scene in plain English so members know where tips go next.",
    });
  }
  if (containsForbiddenUrWorldClaim(clean)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That next-scene line sounds like an investment or charity claim. Name a place to walk.",
    });
  }
  nextScenePublic = clean;
  return nextScenePublic;
}

export function tryApplyNextSceneCommand(message: string): string | null {
  const match = message.trim().match(/^SET NEXT LOOK SCENE\s+(.+)$/i);
  if (!match) return null;
  const line = setNextLookScene(match[1] ?? "");
  return (
    `Next scene is now public on /world: ${line}. Tips after this plaza look go there. Keep posting spend receipts. Not a donation. Not an investment.`
  );
}

/** Owner types this in Business Steward or World Director. */
export function tryApplyLookFundOwnerCommand(message: string): string | null {
  return tryApplyLookSpendCommand(message) ?? tryApplyNextSceneCommand(message);
}

export function _resetLookFundForTests(): void {
  entries.length = 0;
  closers.clear();
  spendReports.length = 0;
  nextScenePublic = UR_WORLD_LOOK_FUND_NEXT_SCENE_LINE;
}
