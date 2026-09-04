/**
 * Plaza look tipper badges — shareable status stickers, not donor certificates.
 * Earned from real tips. Not loot boxes. Not an investment. Not charity.
 */

import type { UrWorldLookFundChipId } from "./ur-world-look-fund";
import { UR_WORLD_LOOK_FUND_CHIP_PACKS } from "./ur-world-look-fund";

export const UR_WORLD_TIP_SHARE_URL = "https://urplatform.llc/world";

export const UR_WORLD_TIP_CHIP_BADGES = [
  { packId: "look_2" as const, id: "spark", name: "Plaza Spark", mark: "✦", hint: "First $2 tip" },
  { packId: "look_10" as const, id: "lamp", name: "Night Lamp", mark: "✶", hint: "$10 tip" },
  { packId: "look_25" as const, id: "stool", name: "Glow Stool", mark: "◇", hint: "$25 tip" },
  { packId: "look_50" as const, id: "fountain", name: "Fountain Friend", mark: "◎", hint: "$50 tip" },
  { packId: "look_100" as const, id: "hall", name: "Civic Hall", mark: "▣", hint: "$100 tip" },
] as const;

export const UR_WORLD_TIPPER_STATUS = [
  { id: "spark", minCents: 200, name: "Plaza Spark", blurb: "Left a first tip for the plaza look." },
  { id: "lamp", minCents: 1_000, name: "Night Lamp", blurb: "Keeps the lamps on." },
  { id: "stool", minCents: 2_500, name: "Glow Stool", blurb: "Pulled up a stool at the Glow Bar." },
  { id: "fountain", minCents: 5_000, name: "Fountain Friend", blurb: "Sat the fountain circle." },
  { id: "hall", minCents: 10_000, name: "Civic Hall Tipper", blurb: "A $100 hand for the civic look." },
  { id: "faithful", minCents: 25_000, name: "Faithful Tipper", blurb: "Shows up again. Creators can wear this on socials." },
  { id: "builder", minCents: 40_000, name: "Scene Builder", blurb: "Tipped enough to fund a Plan B kit on their own." },
] as const;

export type UrWorldTipperStatusId = (typeof UR_WORLD_TIPPER_STATUS)[number]["id"];

export function tipperStatusFromCents(lifetimeCents: number) {
  let current: (typeof UR_WORLD_TIPPER_STATUS)[number] | null = null;
  for (const row of UR_WORLD_TIPPER_STATUS) {
    if (lifetimeCents >= row.minCents) current = row;
  }
  const next = UR_WORLD_TIPPER_STATUS.find((row) => lifetimeCents < row.minCents) ?? null;
  return { current, next };
}

export function buildTipperShareCaption(params: {
  statusName: string;
  unlockedNames: string[];
}): string {
  const unlocked =
    params.unlockedNames.length > 0 ? ` Badges: ${params.unlockedNames.join(", ")}.` : "";
  return (
    `I'm a ${params.statusName} on UR World. Tips help grow the Civic Plaza look — ` +
    `not a charity gift, not tax-deductible, not an investment.${unlocked} ` +
    UR_WORLD_TIP_SHARE_URL
  );
}

export function chipBadgeForPack(packId: string) {
  return UR_WORLD_TIP_CHIP_BADGES.find((b) => b.packId === packId);
}

export const UR_WORLD_TIPPER_BADGE_LICENSE =
  "Tipper badges are entertainment stickers for social posts. They are not donor certificates, not tax documents, not an investment rank, and not a vote in UR Platform LLC.";

/** Every chip pack should have a matching shareable badge. */
export function tipChipPacksHaveBadges(): boolean {
  return UR_WORLD_LOOK_FUND_CHIP_PACKS.every((p) =>
    UR_WORLD_TIP_CHIP_BADGES.some((b) => b.packId === (p.id as UrWorldLookFundChipId)),
  );
}
