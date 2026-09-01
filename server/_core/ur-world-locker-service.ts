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
  UR_WORLD_COSMETIC_LICENSE,
  type EquippedLoadout,
  type UrWorldCosmeticPack,
} from "../../lib/ur-world-cosmetics";
import { UR_WORLD_SHORT_FOOTER } from "../../lib/ur-world-disclosures";
import { avatarLookFromUserId, type UrWorldAvatarLook } from "../../lib/ur-world-avatar";
import { tryApplyWorldReviewCommand } from "./world-monitor-service";
import { computeLotExpiresAt } from "../../lib/ai-talk-time-policy";
import {
  getActiveTalkLots,
  type TalkTimeLot,
} from "./ai-talk-time-tracker";

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
    .filter((p) => !pausedPacks.has(p.id))
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
}): OwnedCosmeticInstance {
  const catalog = liveCosmeticPacks().find((p) => p.id === params.packId);
  if (!catalog) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That apparel pack is not for sale." });
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
  const equipped: EquippedLoadout = {};
  for (const piece of pack.pieces) {
    equipped[piece.slot] = {
      packId: pack.id,
      colorHex: piece.colorHex,
      mesh: piece.mesh,
      name: piece.name,
    };
  }
  locker.equipped = equipped;
  return equipped;
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

export function getLockerSnapshot(userId: string, displayName?: string): {
  avatar: UrWorldAvatarLook;
  equipped: EquippedLoadout;
  owned: Array<OwnedCosmeticInstance & { packName: string; giftable: boolean; priceCents: number }>;
  catalog: UrWorldCosmeticPack[];
  footer: string;
} {
  const locker = lockerFor(userId);
  const avatar = avatarLookFromUserId(userId, displayName);
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
          giftable: !o.opened,
          priceCents: pack ? livePackPriceCents(o.packId) : 0,
        };
      }),
    catalog: liveCosmeticPacks(),
    footer: UR_WORLD_SHORT_FOOTER,
  };
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

export async function tryApplyWorldDirectorCommand(message: string): Promise<string | null> {
  const review = await tryApplyWorldReviewCommand(message);
  if (review) return review;
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
  return null;
}

export function _resetUrWorldLockerForTests(): void {
  lockers.clear();
  extraPacks.clear();
  priceOverrides.clear();
  pausedPacks.clear();
}
