/**
 * Landing free-demo → signup attribution (in-memory ledger; persist to DB when available).
 */

import { createHash, randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import type {
  LandingDemoAttributionRecord,
  LandingDemoConversionStats,
  LandingDemoPlatform,
} from "../../lib/landing-demo-attribution-types";

const MAX_RECORDS = 20_000;
const attributions = new Map<string, LandingDemoAttributionRecord>();

function fingerprintIp(ip: string): string {
  return createHash("sha256").update(`ur-landing-demo:${ip}`).digest("hex").slice(0, 16);
}

function trimRecords(): void {
  if (attributions.size <= MAX_RECORDS) return;
  const sorted = [...attributions.values()].sort((a, b) => a.demoAt.localeCompare(b.demoAt));
  const remove = sorted.slice(0, sorted.length - MAX_RECORDS);
  for (const row of remove) attributions.delete(row.id);
}

export function recordLandingDemoStart(params: {
  ip: string;
  creatorId: string;
  platform: LandingDemoPlatform;
}): LandingDemoAttributionRecord {
  const record: LandingDemoAttributionRecord = {
    id: `demo-${randomUUID().slice(0, 12)}`,
    ipFingerprint: fingerprintIp(params.ip),
    creatorId: params.creatorId,
    platform: params.platform,
    demoAt: new Date().toISOString(),
    signupClickedAt: null,
    convertedAt: null,
    userId: null,
  };
  attributions.set(record.id, record);
  trimRecords();
  return record;
}

export function recordLandingDemoSignupClick(attributionId: string): LandingDemoAttributionRecord {
  const record = attributions.get(attributionId.trim());
  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Demo session not found." });
  }
  if (!record.signupClickedAt) {
    record.signupClickedAt = new Date().toISOString();
    attributions.set(record.id, record);
  }
  return record;
}

export function recordLandingDemoConversion(params: {
  attributionId: string;
  userId: string;
}): LandingDemoAttributionRecord {
  const record = attributions.get(params.attributionId.trim());
  if (!record) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Demo session not found." });
  }
  if (record.convertedAt && record.userId) {
    return record;
  }
  record.convertedAt = new Date().toISOString();
  record.userId = params.userId;
  attributions.set(record.id, record);
  return record;
}

export function getLandingDemoAttribution(id: string): LandingDemoAttributionRecord | null {
  return attributions.get(id.trim()) ?? null;
}

export function getLandingDemoConversionStats(): LandingDemoConversionStats {
  const rows = [...attributions.values()];
  const totalDemos = rows.length;
  const totalSignupClicks = rows.filter((r) => r.signupClickedAt).length;
  const totalConversions = rows.filter((r) => r.convertedAt && r.userId).length;

  const byCreatorMap = new Map<
    string,
    { demos: number; signupClicks: number; conversions: number }
  >();
  const byPlatformMap = new Map<
    LandingDemoPlatform,
    { demos: number; conversions: number }
  >();

  for (const row of rows) {
    const creator = byCreatorMap.get(row.creatorId) ?? {
      demos: 0,
      signupClicks: 0,
      conversions: 0,
    };
    creator.demos += 1;
    if (row.signupClickedAt) creator.signupClicks += 1;
    if (row.convertedAt && row.userId) creator.conversions += 1;
    byCreatorMap.set(row.creatorId, creator);

    const plat = byPlatformMap.get(row.platform) ?? { demos: 0, conversions: 0 };
    plat.demos += 1;
    if (row.convertedAt && row.userId) plat.conversions += 1;
    byPlatformMap.set(row.platform, plat);
  }

  const recentConversions = rows
    .filter((r) => r.convertedAt && r.userId)
    .sort((a, b) => (b.convertedAt ?? "").localeCompare(a.convertedAt ?? ""))
    .slice(0, 25)
    .map((r) => ({
      attributionId: r.id,
      creatorId: r.creatorId,
      platform: r.platform,
      demoAt: r.demoAt,
      convertedAt: r.convertedAt!,
      userId: r.userId!,
    }));

  return {
    totalDemos,
    totalSignupClicks,
    totalConversions,
    demoToClickRate: totalDemos > 0 ? totalSignupClicks / totalDemos : 0,
    demoToSignupRate: totalDemos > 0 ? totalConversions / totalDemos : 0,
    byCreator: [...byCreatorMap.entries()]
      .map(([creatorId, stats]) => ({ creatorId, ...stats }))
      .sort((a, b) => b.conversions - a.conversions || b.demos - a.demos),
    byPlatform: [...byPlatformMap.entries()]
      .map(([platform, stats]) => ({ platform, ...stats }))
      .sort((a, b) => b.demos - a.demos),
    recentConversions,
  };
}

export function _clearLandingDemoAttributionForTests(): void {
  attributions.clear();
}
