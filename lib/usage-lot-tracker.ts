/**
 * Shared used-vs-left tracker for every paid UR product (text, credits, talk, workspace).
 */

export const USAGE_TRACKER_HEADLINE = "Used vs left — unused credits are lost when this purchase expires";

export type UsageLotTrackerView = {
  id: string;
  productId: string;
  productLabel: string;
  unit: string;
  included: number;
  used: number;
  remaining: number;
  expiresAt: string | null;
  expiresAtDisplay: string | null;
  daysUntilExpiry: number | null;
  loseByLabel: string;
  lowBalance: boolean;
  usedToday?: number;
  dailyHardCap?: number;
  dailyRemaining?: number;
};

export function formatUsageExpiryDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function daysUntilUsageExpiry(iso: string, nowMs = Date.now()): number {
  const remainingMs = new Date(iso).getTime() - nowMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function formatUsageLoseBy(iso: string | null, nowMs = Date.now()): string {
  if (!iso) return "No expiry on file for this grant";
  const when = formatUsageExpiryDate(iso);
  const days = daysUntilUsageExpiry(iso, nowMs);
  if (days <= 0) {
    return `Expired ${when} — unused credits from this purchase are lost`;
  }
  if (days === 1) {
    return `Use by ${when} (1 day left) or you lose unused credits from this purchase`;
  }
  return `Use by ${when} (${days} days left) or you lose unused credits from this purchase`;
}

export function isUsageLowBalance(remaining: number, included: number): boolean {
  if (remaining <= 0) return false;
  const threshold = Math.max(1, Math.ceil(included * 0.2));
  return remaining <= threshold;
}

export function formatUsedLeftLine(params: {
  used: number;
  included: number;
  remaining: number;
  unit: string;
}): string {
  return `Used ${params.used} of ${params.included} ${params.unit} · ${params.remaining} left`;
}

export function buildUsageLotTrackerView(params: {
  id: string;
  productId: string;
  productLabel: string;
  unit: string;
  included: number;
  used: number;
  expiresAt?: string | null;
  usedToday?: number;
  dailyHardCap?: number;
  dailyRemaining?: number;
}, nowMs = Date.now()): UsageLotTrackerView {
  const remaining = Math.max(0, params.included - params.used);
  const expiresAt = params.expiresAt ?? null;
  return {
    id: params.id,
    productId: params.productId,
    productLabel: params.productLabel,
    unit: params.unit,
    included: params.included,
    used: params.used,
    remaining,
    expiresAt,
    expiresAtDisplay: expiresAt ? formatUsageExpiryDate(expiresAt) : null,
    daysUntilExpiry: expiresAt ? daysUntilUsageExpiry(expiresAt, nowMs) : null,
    loseByLabel: formatUsageLoseBy(expiresAt, nowMs),
    lowBalance: isUsageLowBalance(remaining, params.included),
    usedToday: params.usedToday,
    dailyHardCap: params.dailyHardCap,
    dailyRemaining: params.dailyRemaining,
  };
}
