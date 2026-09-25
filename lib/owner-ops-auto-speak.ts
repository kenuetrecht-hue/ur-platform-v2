/** Owner ops AIs speak replies on their own after this much platform revenue in one month. */
export const OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS = 1_000_000;

const PLATFORM_REVENUE_TYPES = new Set([
  "live_class_ticket",
  "class_replay_ticket",
  "tip",
  "sandbox_upgrade",
  "other",
]);

/** Calendar month in Indiana, where UR Platform LLC is based. */
export function indianaYearMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Indiana/Indianapolis",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export function sumMonthPlatformRevenueCents(
  rows: { type: string; status: string; amountCents: number; createdAt: string }[],
  now = new Date(),
): number {
  const month = indianaYearMonth(now);
  return rows.reduce((sum, row) => {
    if (row.status !== "completed") return sum;
    if (!PLATFORM_REVENUE_TYPES.has(row.type)) return sum;
    if (!Number.isFinite(row.amountCents) || row.amountCents <= 0) return sum;
    const created = new Date(row.createdAt);
    if (Number.isNaN(created.getTime())) return sum;
    if (indianaYearMonth(created) !== month) return sum;
    return sum + row.amountCents;
  }, 0);
}

export function ownerOpsShouldAutoSpeak(revenueCents: number): boolean {
  return revenueCents >= OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS;
}
