/**
 * Beta / first-30-days audience bonus — 50% off the platform fee for one year.
 *
 * Creators who join during beta or the 30-day launch window and bring
 * 1,000 followers plus 1,000 paid subscribers get 50% off UR's 15% fee
 * for 365 days. If they are in the first, second, or third hundred,
 * that year does not start until their launch-tier advantage ends.
 */

import {
  getLaunchDate,
  getLaunchWindowEnd,
  LAUNCH_PROMOTION_TIERS,
  PLATFORM_FEE_PERCENT,
  type LaunchPromotionTierId,
} from "./launch-promotion-config";

export const FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED = 1000;
export const FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED = 1000;
export const FOUNDING_AUDIENCE_YEAR_DAYS = 365;
export const FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT = 50;

export type LaunchHundredBand = LaunchPromotionTierId | null;

export const FOUNDING_AUDIENCE_YEAR_RULE =
  "Join during beta or the first 30 days and bring 1,000 followers plus 1,000 paid subscribers to your channel: 50% off the platform fee for one year. If you are in the first, second, or third hundred, that year starts only after your launch-tier advantage ends.";

export const FOUNDING_AUDIENCE_YEAR_RULE_SHORT =
  "1,000 followers + 1,000 paid subs → 50% off for a year after any first/second/third-hundred launch deal ends.";

export function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function joinedDuringBetaOrLaunchWindow(params: {
  enrolledAt: Date;
  launchDate?: Date;
}): boolean {
  const launchDate = params.launchDate ?? getLaunchDate();
  const windowEnd = getLaunchWindowEnd(launchDate);
  return params.enrolledAt.getTime() <= windowEnd.getTime();
}

export function launchHundredBandFromSlot(slot: number | null | undefined): LaunchHundredBand {
  if (!slot || slot < 1) return null;
  if (slot <= 100) return 1;
  if (slot <= 200) return 2;
  if (slot <= 300) return 3;
  return null;
}

export function launchAdvantageDurationDays(band: LaunchHundredBand): number {
  if (!band) return 0;
  return LAUNCH_PROMOTION_TIERS[band - 1]!.durationDays;
}

export function launchAdvantageEndsAt(params: {
  enrolledAt: Date;
  launchSlot?: number | null;
}): Date {
  const band = launchHundredBandFromSlot(params.launchSlot);
  const days = launchAdvantageDurationDays(band);
  return new Date(params.enrolledAt.getTime() + daysToMs(days));
}

export function meetsFoundingAudienceThresholds(params: {
  broughtFollowerCount: number;
  paidChannelSubscriberCount: number;
}): boolean {
  return (
    params.broughtFollowerCount >= FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED &&
    params.paidChannelSubscriberCount >= FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED
  );
}

export function discountedPlatformFeePercent(discountPercent: number): number {
  const fee = PLATFORM_FEE_PERCENT * (1 - discountPercent / 100);
  return Math.round(fee * 10) / 10;
}

/** Creator share of a class/merch sale (0–1) for the 50% year offer. */
export function foundingAudienceCreatorSaleShare(): number {
  return (100 - discountedPlatformFeePercent(FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT)) / 100;
}

export type FoundingAudienceYearStatus = {
  joinedInWindow: boolean;
  meetsAudience: boolean;
  verified: boolean;
  launchBand: LaunchHundredBand;
  launchAdvantageEndsAt: string | null;
  yearStartsAt: string | null;
  yearEndsAt: string | null;
  active: boolean;
  waitingOnLaunchAdvantage: boolean;
  waitingOnVerification: boolean;
  platformFeePercent: number;
  creatorKeepPercent: number;
  summary: string;
};

export function resolveFoundingAudienceYear(params: {
  enrolledAt: Date;
  launchSlot?: number | null;
  broughtFollowerCount?: number;
  paidChannelSubscriberCount?: number;
  verified?: boolean;
  launchDate?: Date;
  now?: Date;
}): FoundingAudienceYearStatus {
  const now = params.now ?? new Date();
  const joinedInWindow = joinedDuringBetaOrLaunchWindow({
    enrolledAt: params.enrolledAt,
    launchDate: params.launchDate,
  });
  const meetsAudience = meetsFoundingAudienceThresholds({
    broughtFollowerCount: params.broughtFollowerCount ?? 0,
    paidChannelSubscriberCount: params.paidChannelSubscriberCount ?? 0,
  });
  const verified = params.verified === true;
  const launchBand = launchHundredBandFromSlot(params.launchSlot);
  const advantageEnd = launchAdvantageEndsAt({
    enrolledAt: params.enrolledAt,
    launchSlot: params.launchSlot,
  });
  const yearStart = advantageEnd;
  const yearEnd = new Date(yearStart.getTime() + daysToMs(FOUNDING_AUDIENCE_YEAR_DAYS));
  const waitingOnLaunchAdvantage = now.getTime() < advantageEnd.getTime();
  const waitingOnVerification = !verified || !meetsAudience;
  const eligible = joinedInWindow && meetsAudience && verified;
  const active = eligible && !waitingOnLaunchAdvantage && now.getTime() <= yearEnd.getTime();
  const feePercent = active
    ? discountedPlatformFeePercent(FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT)
    : PLATFORM_FEE_PERCENT;

  let summary: string;
  if (!joinedInWindow) {
    summary = "This year-long 50% offer is only for creators who join during beta or the first 30 days.";
  } else if (!meetsAudience) {
    summary = `Bring ${FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED.toLocaleString()} followers and ${FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED.toLocaleString()} paid subscribers. The year of 50% off starts after any first/second/third-hundred launch deal ends.`;
  } else if (!verified) {
    summary = "Audience numbers are in. UR still needs to confirm them before the year of 50% off starts.";
  } else if (waitingOnLaunchAdvantage) {
    const bandLabel =
      launchBand === 1
        ? "first hundred"
        : launchBand === 2
          ? "second hundred"
          : launchBand === 3
            ? "third hundred"
            : "launch";
    summary = `You qualify. The year of 50% off starts after your ${bandLabel} launch advantage ends on ${advantageEnd.toISOString().slice(0, 10)}.`;
  } else if (active) {
    summary = `50% off the ${PLATFORM_FEE_PERCENT}% platform fee is on through ${yearEnd.toISOString().slice(0, 10)} (you keep ${100 - feePercent}%).`;
  } else {
    summary = "The year of 50% off has ended. Standard 85/15 applies.";
  }

  return {
    joinedInWindow,
    meetsAudience,
    verified,
    launchBand,
    launchAdvantageEndsAt: joinedInWindow ? advantageEnd.toISOString() : null,
    yearStartsAt: eligible ? yearStart.toISOString() : null,
    yearEndsAt: eligible ? yearEnd.toISOString() : null,
    active,
    waitingOnLaunchAdvantage: eligible && waitingOnLaunchAdvantage,
    waitingOnVerification: joinedInWindow && waitingOnVerification,
    platformFeePercent: feePercent,
    creatorKeepPercent: 100 - feePercent,
    summary,
  };
}
