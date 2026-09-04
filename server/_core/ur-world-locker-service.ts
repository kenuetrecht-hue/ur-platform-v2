/**
 * UR World locker — buy packs, equip looks, gift unused inventory.
 * In-memory until persisted. Checkout is simulated in development.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { getUserByEmail } from "../db";
import {
  getCosmeticPack,
  listCosmeticPacks,
  UR_OWNER_SHERIFF_PACK,
  UR_WORLD_COSMETIC_LICENSE,
  loadoutFromPack,
  type EquippedLoadout,
  type UrWorldCosmeticPack,
} from "../../lib/ur-world-cosmetics";
import { UR_WORLD_SHORT_FOOTER } from "../../lib/ur-world-disclosures";
import {
  avatarLookFromUserId,
  normalizeOwnerAvatarTitle,
  UR_OWNER_DEFAULT_TITLE,
  type UrWorldAvatarLook,
} from "../../lib/ur-world-avatar";
import { tryApplyWorldReviewCommand } from "./world-monitor-service";
import { computeLotExpiresAt } from "../../lib/ai-talk-time-policy";
import { getActiveTalkLots, type TalkTimeLot } from "./ai-talk-time-tracker";
import { creditApparelCutToLookFund, tryApplyLookFundOwnerCommand } from "./ur-world-look-fund-service";

export type OwnedCosmeticInstance = {
  instanceId: string;
  packId: string;
  purchasedAt: string;
  opened: boolean;
  giftedAway: boolean;
};

type Locker = {
  owned: OwnedCosmeticInstance[];
  equipped: EquippedLoadout;
};

const lockers = new Map<string, Locker>();
const extraPacks = new Map<string, UrWorldCosmeticPack>();
const priceOverrides = new Map<string, number>();
const pausedPacks = new Set<string>();
let ownerAvatarTitle = UR_OWNER_DEFAULT_TITLE;

function lockerFor(userId: string): Locker {
  let row = lockers.get(userId);
  if (!row) {
    row = { owned: [], equipped: {} };
    lockers.set(userId, row);
  }
  return row;
}

export function resolveCosmeticPack(id: string): UrWorldCosmeticPack | undefined {
  return extraPacks.get(id) ?? getCosmeticPack(id);
}

export function liveCosmeticPacks(): UrWorldCosmeticPack[] {
  const seeded = listCosmeticPacks();
  const extras = [...extraPacks.values()];
  return [...seeded, ...extras]
    .filter((p) => !pausedPacks.has(p.id) && !p.ownerOnly)
    .map((p) => ({
      ...p,
      priceCents: priceOverrides.get(p.id) ?? p.priceCents,
      pieces: p.pieces.map((x) => ({ ...x })),
    }));
}

export function livePackPriceCents(packId: string): number {
  const pack = resolveCosmeticPack(packId);
  if (!pack) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That apparel pack is not in the locker." });
  }
  return priceOverrides.get(packId) ?? pack.priceCents;
}

export function purchaseCosmeticPack(params: {
  userId: string;
  userEmail: string;
  packId: string;
  displayName?: string;
}): OwnedCosmeticInstance {
  const catalog = liveCosmeticPacks().find((p) => p.id === params.packId);
  if (!catalog) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That apparel pack is not for sale." });
  }
  if (catalog.ownerOnly || resolveCosmeticPack(params.packId)?.ownerOnly) {
    throw new TRPCError({ code: "FORBIDDEN", message: "That look is not for sale." });
  }
  const priceCents = catalog.priceCents;
  if (priceCents === 500) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Apparel packs cannot be priced at exactly $5.00.",
    });
  }
  const instance: OwnedCosmeticInstance = {
    instanceId: randomUUID(),
    packId: catalog.id,
    purchasedAt: new Date().toISOString(),
    opened: false,
    giftedAway: false,
  };
  lockerFor(params.userId).owned.push(instance);
  recordTransaction({
    type: "other",
    amountCents: priceCents,
    description: `UR World apparel pack ${catalog.name} — ${UR_WORLD_COSMETIC_LICENSE}`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: { urWorld: true, cosmeticPackId: catalog.id, instanceId: instance.instanceId },
  });
  creditApparelCutToLookFund({
    userId: params.userId,
    displayName: params.displayName,
    apparelPriceCents: priceCents,
    packId: catalog.id,
  });
  return instance;
}

export function wearCosmeticPack(params: { userId: string; instanceId: string }): EquippedLoadout {
  return equipCosmeticPack(params);
}

export function equipCosmeticPack(params: { userId: string; instanceId: string }): EquippedLoadout {
  const locker = lockerFor(params.userId);
  const inst = locker.owned.find((o) => o.instanceId === params.instanceId && !o.giftedAway);
  if (!inst) {
    throw new TRPCError({ code: "NOT_FOUND", message: "You do not hold that pack." });
  }
  const pack = resolveCosmeticPack(inst.packId);
  if (!pack) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Pack catalog missing." });
  }
  inst.opened = true;
  locker.equipped = loadoutFromPack(pack);
  return locker.equipped;
}

export function clearEquippedLook(userId: string): void {
  lockerFor(userId).equipped = {};
}

export async function giftCosmeticPack(params: {
  fromUserId: string;
  fromEmail: string;
  instanceId: string;
  toEmail: string;
}): Promise<{ toUserId: string }> {
  const locker = lockerFor(params.fromUserId);
  const inst = locker.owned.find((o) => o.instanceId === params.instanceId && !o.giftedAway);
  if (!inst) {
    throw new TRPCError({ code: "NOT_FOUND", message: "You do not hold that pack." });
  }
  if (inst.opened) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You already wore that pack. Only unused apparel can be gifted.",
    });
  }
  if (resolveCosmeticPack(inst.packId)?.ownerOnly) {
    throw new TRPCError({ code: "FORBIDDEN", message: "The owner look cannot be gifted." });
  }
  const email = params.toEmail.trim().toLowerCase();
  if (!email || email === params.fromEmail.trim().toLowerCase()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gift to another member’s email." });
  }
  const recipient = await getUserByEmail(email);
  if (!recipient) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That person does not have a UR account yet. They need to join and pass 18+ KYC first.",
    });
  }
  const toUserId = String(recipient.id);
  if (toUserId === params.fromUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gift to another member." });
  }
  inst.giftedAway = true;
  lockerFor(toUserId).owned.push({
    ...inst,
    giftedAway: false,
    opened: false,
  });
  return { toUserId };
}

/** Test helper — gift by user id without DB. */
export function giftCosmeticPackToUserIdForTests(params: {
  fromUserId: string;
  instanceId: string;
  toUserId: string;
}): void {
  const locker = lockerFor(params.fromUserId);
  const inst = locker.owned.find((o) => o.instanceId === params.instanceId && !o.giftedAway);
  if (!inst || inst.opened) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Pack is not giftable." });
  }
  inst.giftedAway = true;
  lockerFor(params.toUserId).owned.push({ ...inst, giftedAway: false, opened: false });
}

export function listGiftableTalkLots(userId: string): TalkTimeLot[] {
  return getActiveTalkLots(userId).filter((lot) => lot.millisecondsUsed === 0 && lot.packId !== "loyalty_talk");
}

export function giftUnusedTalkLot(params: {
  fromUserId: string;
  lotId: string;
  toUserId: string;
}): TalkTimeLot {
  if (params.fromUserId === params.toUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gift to another member." });
  }
  const lot = getActiveTalkLots(params.fromUserId).find((l) => l.id === params.lotId);
  if (!lot) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Talk pack not found." });
  }
  if (lot.millisecondsUsed > 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only unused Talk packs can be gifted. Remaining minutes stay with you.",
    });
  }
  if (lot.packId === "loyalty_talk") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Loyalty minutes cannot be gifted." });
  }
  lot.userId = params.toUserId;
  lot.purchasedAt = new Date().toISOString();
  lot.expiresAt = computeLotExpiresAt(Date.now());
  return lot;
}

export function getLockerSnapshot(
  userId: string,
  displayName?: string,
  isPlatformOwner = false,
): {
  avatar: UrWorldAvatarLook;
  equipped: EquippedLoadout;
  owned: Array<OwnedCosmeticInstance & { packName: string; giftable: boolean; priceCents: number; ownerOnly: boolean }>;
  catalog: UrWorldCosmeticPack[];
  footer: string;
  ownerTitle?: string;
} {
  const locker = lockerFor(userId);
  if (isPlatformOwner) {
    ensureOwnerSheriffLocker(userId);
  }
  const avatar = avatarLookFromUserId(userId, displayName, {
    isPlatformOwner,
    ownerTitle: isPlatformOwner ? ownerAvatarTitle : undefined,
  });
  return {
    avatar,
    equipped: locker.equipped,
    owned: locker.owned
      .filter((o) => !o.giftedAway)
      .map((o) => {
        const pack = resolveCosmeticPack(o.packId);
        return {
          ...o,
          packName: pack?.name ?? o.packId,
          giftable: !o.opened && !pack?.ownerOnly,
          priceCents: pack && !pack.ownerOnly ? livePackPriceCents(o.packId) : 0,
          ownerOnly: Boolean(pack?.ownerOnly),
        };
      }),
    catalog: liveCosmeticPacks(),
    footer: UR_WORLD_SHORT_FOOTER,
    ownerTitle: isPlatformOwner ? ownerAvatarTitle : undefined,
  };
}

function ensureOwnerSheriffLocker(userId: string): void {
  const locker = lockerFor(userId);
  const already = locker.owned.some((o) => o.packId === UR_OWNER_SHERIFF_PACK.id && !o.giftedAway);
  if (!already) {
    locker.owned.push({
      instanceId: `owner-sheriff-${userId}`,
      packId: UR_OWNER_SHERIFF_PACK.id,
      purchasedAt: new Date().toISOString(),
      opened: true,
      giftedAway: false,
    });
  }
  if (Object.keys(locker.equipped).length === 0) {
    locker.equipped = loadoutFromPack(UR_OWNER_SHERIFF_PACK);
  }
}

export function dressOwnerLook(ownerUserId: string, packId = UR_OWNER_SHERIFF_PACK.id): EquippedLoadout {
  const pack = resolveCosmeticPack(packId);
  if (!pack || !pack.ownerOnly) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That is not an owner-only look." });
  }
  ensureOwnerSheriffLocker(ownerUserId);
  const locker = lockerFor(ownerUserId);
  if (!locker.owned.some((o) => o.packId === pack.id && !o.giftedAway)) {
    locker.owned.push({
      instanceId: `owner-${pack.id}-${ownerUserId}`,
      packId: pack.id,
      purchasedAt: new Date().toISOString(),
      opened: true,
      giftedAway: false,
    });
  }
  locker.equipped = loadoutFromPack(pack);
  return locker.equipped;
}

function parseOutfitHex(raw: string): string {
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Colors must be hex like #e7e0d4." });
  }
  return hex.toLowerCase();
}

export function makeOwnerOutfit(params: {
  ownerUserId: string;
  slug: string;
  shirtHex: string;
  jeansHex: string;
  shoesHex: string;
}): UrWorldCosmeticPack {
  const id = `owner-${params.slug}`;
  if (id === UR_OWNER_SHERIFF_PACK.id) {
    throw new TRPCError({ code: "CONFLICT", message: "That id is reserved." });
  }
  const shirt = parseOutfitHex(params.shirtHex);
  const jeans = parseOutfitHex(params.jeansHex);
  const shoes = parseOutfitHex(params.shoesHex);
  const pack: UrWorldCosmeticPack = {
    id,
    name: `Owner ${params.slug.replace(/-/g, " ")}`,
    tagline: "Custom owner look — not sold, not giftable, not a member pack.",
    district: "Civic Plaza",
    priceCents: 199,
    ownerOnly: true,
    pieces: [
      { slot: "hair", name: "Casual crop", colorHex: "#3b2f2a", mesh: "hair" },
      { slot: "jacket", name: "Custom shirt", colorHex: shirt, mesh: "shirt" },
      { slot: "pants", name: "Custom jeans", colorHex: jeans, mesh: "jeans" },
      { slot: "boots", name: "Custom sneakers", colorHex: shoes, mesh: "sneakers" },
      { slot: "accent", name: "UR Sheriff star", colorHex: "#e8c547", mesh: "star" },
    ],
  };
  extraPacks.set(pack.id, pack);
  dressOwnerLook(params.ownerUserId, pack.id);
  return pack;
}

export function ownerSetWorldPackPrice(packId: string, priceCents: number): { packId: string; priceCents: number } {
  if (!Number.isInteger(priceCents) || priceCents < 99 || priceCents > 4999) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Apparel pack price must be $0.99–$49.99." });
  }
  if (priceCents === 500) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Do not price apparel at exactly $5.00." });
  }
  if (!resolveCosmeticPack(packId) && !liveCosmeticPacks().some((p) => p.id === packId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown apparel pack." });
  }
  priceOverrides.set(packId, priceCents);
  return { packId, priceCents };
}

export function ownerPauseWorldPack(packId: string, paused: boolean): void {
  if (!resolveCosmeticPack(packId)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown apparel pack." });
  }
  if (paused) pausedPacks.add(packId);
  else pausedPacks.delete(packId);
}

export function ownerAddWorldPack(pack: UrWorldCosmeticPack): UrWorldCosmeticPack {
  if (getCosmeticPack(pack.id) || extraPacks.has(pack.id)) {
    throw new TRPCError({ code: "CONFLICT", message: "That pack id already exists." });
  }
  if (pack.priceCents === 500) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Do not price apparel at exactly $5.00." });
  }
  extraPacks.set(pack.id, pack);
  return pack;
}

export async function tryApplyWorldDirectorCommand(
  message: string,
  opts?: { ownerUserId?: string },
): Promise<string | null> {
  const review = await tryApplyWorldReviewCommand(message);
  if (review) return review;
  const lookFund = tryApplyLookFundOwnerCommand(message);
  if (lookFund) return lookFund;
  const set = message.match(/^SET WORLD PACK PRICE\s+([a-z0-9-]+)\s+(\d+(?:\.\d{1,2})?)\s*$/i);
  if (set) {
    const packId = set[1]!.toLowerCase();
    const dollars = Number(set[2]);
    const cents = Math.round(dollars * 100);
    const result = ownerSetWorldPackPrice(packId, cents);
    return `Updated ${result.packId} to $${(result.priceCents / 100).toFixed(2)}. Members see it immediately. Not an investment.`;
  }
  const pause = message.match(/^(PAUSE|UNPAUSE) WORLD PACK\s+([a-z0-9-]+)\s*$/i);
  if (pause) {
    const packId = pause[2]!.toLowerCase();
    ownerPauseWorldPack(packId, pause[1]!.toUpperCase() === "PAUSE");
    return `${pause[1]} ${packId}.`;
  }
  const titleCmd = message.match(/^SET OWNER TITLE\s+(.+)$/i);
  if (titleCmd) {
    const title = normalizeOwnerAvatarTitle(titleCmd[1] ?? "");
    if (!title) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Title must be one of: ${["UR Sheriff", "UR Founder", "Civic Host"].join(", ")}.`,
      });
    }
    ownerAvatarTitle = title;
    return `Your plaza title is ${title}. Refresh /world to see it on your avatar.`;
  }
  const dress = message.match(/^DRESS OWNER(?:\s+([a-z0-9-]+))?\s*$/i);
  if (dress) {
    if (!opts?.ownerUserId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Owner account is required to dress the sheriff look." });
    }
    const packId = (dress[1] ?? UR_OWNER_SHERIFF_PACK.id).toLowerCase();
    dressOwnerLook(opts.ownerUserId, packId);
    return `You’re wearing ${packId} in Civic Plaza. Casual owner look — members cannot buy or copy it.`;
  }
  const outfit = message.match(
    /^MAKE OWNER OUTFIT\s+([a-z0-9-]+)\s+shirt\s+(#[0-9a-f]{6}|[0-9a-f]{6})\s+jeans\s+(#[0-9a-f]{6}|[0-9a-f]{6})\s+shoes\s+(#[0-9a-f]{6}|[0-9a-f]{6})\s*$/i,
  );
  if (outfit) {
    if (!opts?.ownerUserId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Owner account is required to make an outfit." });
    }
    const pack = makeOwnerOutfit({
      ownerUserId: opts.ownerUserId,
      slug: outfit[1]!.toLowerCase(),
      shirtHex: outfit[2]!,
      jeansHex: outfit[3]!,
      shoesHex: outfit[4]!,
    });
    return `Made ${pack.name} (${pack.id}) and put it on you. Members never see this in the locker. Wear again with: DRESS OWNER ${pack.id}`;
  }
  return null;
}

export function _resetUrWorldLockerForTests(): void {
  lockers.clear();
  extraPacks.clear();
  priceOverrides.clear();
  pausedPacks.clear();
  ownerAvatarTitle = UR_OWNER_DEFAULT_TITLE;
}
