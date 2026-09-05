/**
 * 30-day launch audience bonus — a full year of 50% or 60% off the platform fee.
 *
 * During the 30-day window, a creator who brings 1,000 followers and 1,000 paid
 * subscribers — different people, 2,000 unique — gets 50% off UR's 15% fee for
 * 365 days. Reach 2,000 followers and 2,000 paid subscribers — 4,000 unique —
 * in that same window and the year is 60% off instead.
 *
 * First 300: the year starts only after the launch-tier deal ends. After slot
 * 300: 50% starts the moment they hit 2,000; if they then hit 4,000 in the
 * 30 days, the remaining year switches to 60% (the year clock does not restart).
 * After the 30 days, new creators get regular 85/15.
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
export const FOUNDING_AUDIENCE_UNIQUE_PEOPLE_REQUIRED = 2000;
export const FOUNDING_AUDIENCE_BOOST_FOLLOWERS_REQUIRED = 2000;
export const FOUNDING_AUDIENCE_BOOST_PAID_SUBSCRIBERS_REQUIRED = 2000;
export const FOUNDING_AUDIENCE_BOOST_UNIQUE_PEOPLE_REQUIRED = 4000;
export const FOUNDING_AUDIENCE_YEAR_DAYS = 365;
export const FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT = 50;
export const FOUNDING_AUDIENCE_BOOST_FEE_DISCOUNT_PERCENT = 60;

export type LaunchHundredBand = LaunchPromotionTierId | null;

export const FOUNDING_AUDIENCE_YEAR_RULE =
  "During the 30-day launch, bring 1,000 followers and 1,000 paid subscribers — different people, 2,000 unique — and get a full year of 50% off the platform fee. Reach 2,000 followers and 2,000 paid subscribers — 4,000 unique — in those same 30 days and that year is 60% off instead. If you are in the first 300, the year starts only after your launch-tier deal ends. After slot 300, 50% starts the moment you hit 2,000; hitting 4,000 in the 30 days switches the rest of that same year to 60%. After the 30 days, new creators get regular 85/15.";

export const FOUNDING_AUDIENCE_YEAR_RULE_SHORT =
  "2,000 different people in 30 days → a year of 50% off. 4,000 (2,000 followers + 2,000 paid) in those 30 days → 60% for that year. First 300: the year starts after your launch deal. After slot 300: 50% starts when you hit 2,000; 4,000 in 30 days upgrades the rest of that year to 60%.";

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

export function foundingAudienceYearClockStartsAt(params: {
  enrolledAt: Date;
  launchSlot?: number | null;
  twoThousandReachedAt?: Date | null;
}): Date {
  const inFirst300 = launchHundredBandFromSlot(params.launchSlot) != null;
  if (inFirst300) return launchAdvantageEndsAt(params);
  return params.twoThousandReachedAt ?? launchAdvantageEndsAt(params);
}

export function foundingAudienceYearEndsAt(params: {
  enrolledAt: Date;
  launchSlot?: number | null;
  twoThousandReachedAt?: Date | null;
}): Date {
  const yearStart = foundingAudienceYearClockStartsAt(params);
  return new Date(yearStart.getTime() + daysToMs(FOUNDING_AUDIENCE_YEAR_DAYS));
}

export function meetsFoundingAudienceThresholds(params: {
  broughtFollowerCount: number;
  paidChannelSubscriberCount: number;
}): boolean {
  const freeFollowers = params.broughtFollowerCount;
  const paid = params.paidChannelSubscriberCount;
  return (
    freeFollowers >= FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED &&
    paid >= FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED &&
    freeFollowers + paid >= FOUNDING_AUDIENCE_UNIQUE_PEOPLE_REQUIRED
  );
}

export function meetsFoundingAudienceBoostThresholds(params: {
  broughtFollowerCount: number;
  paidChannelSubscriberCount: number;
}): boolean {
  const freeFollowers = params.broughtFollowerCount;
  const paid = params.paidChannelSubscriberCount;
  return (
    freeFollowers >= FOUNDING_AUDIENCE_BOOST_FOLLOWERS_REQUIRED &&
    paid >= FOUNDING_AUDIENCE_BOOST_PAID_SUBSCRIBERS_REQUIRED &&
    freeFollowers + paid >= FOUNDING_AUDIENCE_BOOST_UNIQUE_PEOPLE_REQUIRED
  );
}

export function discountedPlatformFeePercent(discountPercent: number): number {
  const fee = PLATFORM_FEE_PERCENT * (1 - discountPercent / 100);
  return Math.round(fee * 10) / 10;
}

/** Creator share of a class/merch sale (0–1) for the year-long audience offer. */
export function foundingAudienceCreatorSaleShare(
  discountPercent = FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT,
): number {
  return (100 - discountedPlatformFeePercent(discountPercent)) / 100;
}

export type FoundingAudienceYearStatus = {
  joinedInWindow: boolean;
  meetsAudience: boolean;
  meetsBoostAudience: boolean;
  verified: boolean;
  launchBand: LaunchHundredBand;
  launchAdvantageEndsAt: string | null;
  yearStartsAt: string | null;
  yearEndsAt: string | null;
  active: boolean;
  waitingOnLaunchAdvantage: boolean;
  waitingOnVerification: boolean;
  uniquePeopleCount: number;
  feeDiscountPercent: number;
  platformFeePercent: number;
  creatorKeepPercent: number;
  summary: string;
};

function launchBandLabel(band: LaunchHundredBand): string {
  if (band === 1) return "first hundred";
  if (band === 2) return "second hundred";
  if (band === 3) return "third hundred";
  return "launch";
}

export function resolveFoundingAudienceYear(params: {
  enrolledAt: Date;
  launchSlot?: number | null;
  broughtFollowerCount?: number;
  paidChannelSubscriberCount?: number;
  verified?: boolean;
  launchDate?: Date;
  now?: Date;
  twoThousandReachedAt?: Date | null;
}): FoundingAudienceYearStatus {
  const now = params.now ?? new Date();
  const launchDate = params.launchDate ?? getLaunchDate();
  const windowEnd = getLaunchWindowEnd(launchDate);
  const joinedInWindow = joinedDuringBetaOrLaunchWindow({
    enrolledAt: params.enrolledAt,
    launchDate,
  });
  const freeFollowers = params.broughtFollowerCount ?? 0;
  const paid = params.paidChannelSubscriberCount ?? 0;
  const uniquePeopleCount = freeFollowers + paid;
  const meetsAudience = meetsFoundingAudienceThresholds({
    broughtFollowerCount: freeFollowers,
    paidChannelSubscriberCount: paid,
  });
  const meetsBoost = meetsFoundingAudienceBoostThresholds({
    broughtFollowerCount: freeFollowers,
    paidChannelSubscriberCount: paid,
  });
  const verified = params.verified === true;
  const launchBand = launchHundredBandFromSlot(params.launchSlot);
  const advantageEnd = launchAdvantageEndsAt({
    enrolledAt: params.enrolledAt,
    launchSlot: params.launchSlot,
  });
  const yearStart = foundingAudienceYearClockStartsAt({
    enrolledAt: params.enrolledAt,
    launchSlot: params.launchSlot,
    twoThousandReachedAt: params.twoThousandReachedAt,
  });
  const yearEnd = foundingAudienceYearEndsAt({
    enrolledAt: params.enrolledAt,
    launchSlot: params.launchSlot,
    twoThousandReachedAt: params.twoThousandReachedAt,
  });
  const waitingOnLaunchAdvantage = now.getTime() < advantageEnd.getTime();
  const waitingOnVerification = !verified || !meetsAudience;
  const eligible = joinedInWindow && meetsAudience && verified;
  const active =
    eligible && !waitingOnLaunchAdvantage && now.getTime() <= yearEnd.getTime();
  const yearDiscountPercent = meetsBoost
    ? FOUNDING_AUDIENCE_BOOST_FEE_DISCOUNT_PERCENT
    : meetsAudience
      ? FOUNDING_AUDIENCE_FEE_DISCOUNT_PERCENT
      : 0;
  const feePercent = active
    ? discountedPlatformFeePercent(yearDiscountPercent)
    : PLATFORM_FEE_PERCENT;
  const stillInWindow = now.getTime() <= windowEnd.getTime();

  let summary: string;
  if (!joinedInWindow) {
    summary =
      "The 30-day launch is over. New creators get regular everyday service (85/15).";
  } else if (!meetsAudience) {
    summary = `Bring ${FOUNDING_AUDIENCE_FOLLOWERS_REQUIRED.toLocaleString()} followers and ${FOUNDING_AUDIENCE_PAID_SUBSCRIBERS_REQUIRED.toLocaleString()} paid subscribers — different people, ${FOUNDING_AUDIENCE_UNIQUE_PEOPLE_REQUIRED.toLocaleString()} unique — during these 30 days. You have ${uniquePeopleCount.toLocaleString()} so far. That unlocks a full year of 50% off. Reach ${FOUNDING_AUDIENCE_BOOST_UNIQUE_PEOPLE_REQUIRED.toLocaleString()} unique (${FOUNDING_AUDIENCE_BOOST_FOLLOWERS_REQUIRED.toLocaleString()} followers + ${FOUNDING_AUDIENCE_BOOST_PAID_SUBSCRIBERS_REQUIRED.toLocaleString()} paid) in the same 30 days for 60% off that year.`;
  } else if (!verified) {
    summary =
      "Audience numbers are in. UR still needs to confirm them before the year of 50% starts.";
  } else if (waitingOnLaunchAdvantage) {
    const yearOff = meetsBoost ? "60%" : "50%";
    const boostHint =
      !meetsBoost && stillInWindow
        ? ` Hit ${FOUNDING_AUDIENCE_BOOST_UNIQUE_PEOPLE_REQUIRED.toLocaleString()} different people in these 30 days and that year is 60% off instead.`
        : "";
    summary = `You qualify with ${FOUNDING_AUDIENCE_UNIQUE_PEOPLE_REQUIRED.toLocaleString()} different people. Your full year of ${yearOff} off starts after your ${launchBandLabel(launchBand)} launch deal ends on ${advantageEnd.toISOString().slice(0, 10)}.${boostHint}`;
  } else if (active) {
    const yearOff = meetsBoost ? "60%" : "50%";
    const boostHint =
      !meetsBoost && stillInWindow
        ? ` Hit ${FOUNDING_AUDIENCE_BOOST_UNIQUE_PEOPLE_REQUIRED.toLocaleString()} different people before the 30-day window ends and the rest of this year switches to 60% off.`
        : "";
    summary = `Your year of ${yearOff} off the ${PLATFORM_FEE_PERCENT}% platform fee is on through ${yearEnd.toISOString().slice(0, 10)} (you keep ${100 - feePercent}%).${boostHint}`;
  } else {
    summary = `Your year of ${meetsBoost ? "60%" : "50%"} off has ended. Standard 85/15 applies.`;
  }

  return {
    joinedInWindow,
    meetsAudience,
    meetsBoostAudience: meetsBoost,
    verified,
    launchBand,
    launchAdvantageEndsAt: joinedInWindow ? advantageEnd.toISOString() : null,
    yearStartsAt: eligible ? yearStart.toISOString() : null,
    yearEndsAt: eligible ? yearEnd.toISOString() : null,
    active,
    waitingOnLaunchAdvantage: eligible && waitingOnLaunchAdvantage,
    waitingOnVerification: joinedInWindow && waitingOnVerification,
    uniquePeopleCount,
    feeDiscountPercent: active ? yearDiscountPercent : 0,
    platformFeePercent: feePercent,
    creatorKeepPercent: 100 - feePercent,
    summary,
  };
}
