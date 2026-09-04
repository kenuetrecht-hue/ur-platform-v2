/**
 * Thanks stamps ledger — in-memory until persisted with the rest of stamps.
 * Not the old stamps-for-AI-access meter. Not plaza look tips.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { sanitizeUserText } from "./input-sanitize";
import { isCreatorAiId, getCreatorAi } from "./ai-creator-registry";
import { getUserByEmail } from "../db";
import {
  getMonthlyThanksSeal,
  getThanksStampPack,
  getWeeklyThanksSet,
  UR_THANKS_STAMP_PACKS,
  UR_THANKS_STAMPS_PURPOSE,
  thanksStampPackChannel,
  type ThanksStampDesign,
  type UrThanksStampPackId,
} from "../../lib/ur-thanks-stamps";
import { calculateCustomerCheckout } from "../../lib/stripe-checkout-pricing";

export type ThanksStampInstance = {
  instanceId: string;
  userId: string;
  design: ThanksStampDesign;
  setName: string;
  purchasedAt: string;
  giftable: boolean;
  placed: boolean;
};

type WallPost = {
  id: string;
  targetType: "ai" | "member";
  targetId: string;
  design: ThanksStampDesign;
  setName: string;
  fromName: string;
  note: string;
  at: string;
};

const inventory = new Map<string, ThanksStampInstance[]>();
const walls: WallPost[] = [];

function publicThanksName(raw: string | undefined): string {
  const stripped = (raw ?? "").replace(/@\S+/g, " ");
  const clean = sanitizeUserText(stripped, 40);
  const first = clean.split(/\s+/).find((part) => part.length >= 2) ?? "";
  if (!first || /https?:/i.test(first)) return "A member";
  return first.slice(0, 18);
}

function bagFor(userId: string): ThanksStampInstance[] {
  let bag = inventory.get(userId);
  if (!bag) {
    bag = [];
    inventory.set(userId, bag);
  }
  return bag;
}

export function getThanksStampsCatalog(at = new Date()) {
  const weekly = getWeeklyThanksSet(at);
  const monthSeal = getMonthlyThanksSeal(at);
  return {
    purpose: UR_THANKS_STAMPS_PURPOSE,
    packs: UR_THANKS_STAMP_PACKS.map((p) => ({
      ...p,
      requiredPaymentChannel: thanksStampPackChannel(p.priceCents),
    })),
    weekly,
    monthSeal,
    rotationNote:
      "A new four-stamp set each week. $5 · 20 stamps is the iPhone/Android in-app pack (Apple and Google). Other packs are on the website. $20 and $25 also include this month’s seal. You see the designs before you buy — not a mystery box.",
  };
}

export function getThanksStampsWallet(userId: string) {
  const items = bagFor(userId)
    .filter((row) => !row.placed)
    .map((row) => ({
      instanceId: row.instanceId,
      name: row.design.name,
      mark: row.design.mark,
      colorHex: row.design.colorHex,
      setName: row.setName,
      giftable: row.giftable,
    }));
  return { items, count: items.length, purpose: UR_THANKS_STAMPS_PURPOSE };
}

export function purchaseThanksStampPack(params: {
  userId: string;
  userEmail: string;
  packId: UrThanksStampPackId;
  billingStateCode?: string | null;
}): { added: number; packLabel: string; checkout: ReturnType<typeof calculateCustomerCheckout> } {
  const pack = getThanksStampPack(params.packId);
  if (!pack) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown thanks-stamp pack." });
  }
  const weekly = getWeeklyThanksSet();
  const bag = bagFor(params.userId);
  let added = 0;
  for (let q = 0; q < pack.dollars; q++) {
    for (const design of weekly.stamps) {
      bag.push({
        instanceId: randomUUID(),
        userId: params.userId,
        design: { ...design },
        setName: weekly.name,
        purchasedAt: new Date().toISOString(),
        giftable: true,
        placed: false,
      });
      added += 1;
    }
  }
  if (pack.includeMonthSeal) {
    const seal = getMonthlyThanksSeal();
    bag.push({
      instanceId: randomUUID(),
      userId: params.userId,
      design: seal,
      setName: "Month seal",
      purchasedAt: new Date().toISOString(),
      giftable: true,
      placed: false,
    });
    added += 1;
  }
  const checkout = calculateCustomerCheckout(pack.priceCents, params.billingStateCode);
  recordTransaction({
    type: "other",
    amountCents: pack.priceCents,
    description: `UR Thanks stamps ${pack.label} — stickers, not cash, not a donation`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: {
      thanksStamps: true,
      packId: pack.id,
      added,
      chargeCents: checkout.totalCents,
      salesTaxCents: checkout.salesTaxCents,
      stripeFeeCents: checkout.stripeFeeCents,
    },
  });
  return { added, packLabel: pack.label, checkout };
}

export async function giftThanksStamp(params: {
  fromUserId: string;
  instanceId: string;
  toEmail: string;
}): Promise<void> {
  const toEmail = sanitizeUserText(params.toEmail, 254).toLowerCase();
  const recipient = await getUserByEmail(toEmail);
  if (!recipient) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That person does not have a UR account yet. They need to join and pass 18+ KYC first.",
    });
  }
  if (String(recipient.id) === params.fromUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot gift a stamp to yourself." });
  }
  const bag = bagFor(params.fromUserId);
  const item = bag.find((row) => row.instanceId === params.instanceId);
  if (!item || item.placed) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That stamp is not in your unused pile." });
  }
  if (!item.giftable) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That stamp was already gifted once. Place it on a page instead." });
  }
  bag.splice(bag.indexOf(item), 1);
  bagFor(String(recipient.id)).push({
    ...item,
    userId: String(recipient.id),
    giftable: false,
  });
}

/** Test helper — skip email lookup. */
export function giftThanksStampToUserIdForTests(params: {
  fromUserId: string;
  instanceId: string;
  toUserId: string;
}): void {
  if (params.fromUserId === params.toUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot gift a stamp to yourself." });
  }
  const bag = bagFor(params.fromUserId);
  const item = bag.find((row) => row.instanceId === params.instanceId);
  if (!item || item.placed || !item.giftable) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "That stamp cannot be gifted." });
  }
  bag.splice(bag.indexOf(item), 1);
  bagFor(params.toUserId).push({ ...item, userId: params.toUserId, giftable: false });
}

export async function placeThanksStampOnMemberByEmail(params: {
  userId: string;
  displayName?: string;
  instanceId: string;
  toEmail: string;
  note?: string;
}): Promise<WallPost> {
  const toEmail = sanitizeUserText(params.toEmail, 254).toLowerCase();
  const recipient = await getUserByEmail(toEmail);
  if (!recipient) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "That person does not have a UR account yet. They need to join and pass 18+ KYC first.",
    });
  }
  if (String(recipient.id) === params.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Place a stamp on someone else's page — or stick it on an AI you appreciate.",
    });
  }
  return placeThanksStamp({
    userId: params.userId,
    displayName: params.displayName,
    instanceId: params.instanceId,
    targetType: "member",
    targetId: String(recipient.id),
    note: params.note,
  });
}

export function placeThanksStamp(params: {
  userId: string;
  displayName?: string;
  instanceId: string;
  targetType: "ai" | "member";
  targetId: string;
  note?: string;
}): WallPost {
  const bag = bagFor(params.userId);
  const item = bag.find((row) => row.instanceId === params.instanceId && !row.placed);
  if (!item) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That stamp is not in your unused pile." });
  }
  const targetId = sanitizeUserText(params.targetId, 80);
  if (params.targetType === "ai") {
    if (!isCreatorAiId(targetId) || !getCreatorAi(targetId)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "That AI is not on UR." });
    }
  } else if (!targetId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Missing page to thank." });
  }
  const note = sanitizeUserText(params.note ?? "", 80);
  item.placed = true;
  item.giftable = false;
  const post: WallPost = {
    id: randomUUID(),
    targetType: params.targetType,
    targetId,
    design: item.design,
    setName: item.setName,
    fromName: publicThanksName(params.displayName),
    note,
    at: new Date().toISOString(),
  };
  walls.unshift(post);
  if (walls.length > 400) walls.length = 400;
  return post;
}

/** Spend one unused stamp as a social-feed emoji. Not a tip. */
export function spendThanksStampForReaction(params: {
  userId: string;
  instanceId: string;
  displayName?: string;
}): { design: ThanksStampDesign; setName: string; fromName: string } {
  const bag = bagFor(params.userId);
  const item = bag.find((row) => row.instanceId === params.instanceId && !row.placed);
  if (!item) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That stamp is not in your unused pile." });
  }
  item.placed = true;
  item.giftable = false;
  return {
    design: item.design,
    setName: item.setName,
    fromName: publicThanksName(params.displayName),
  };
}

export function getThanksStampWall(targetType: "ai" | "member", targetId: string) {
  const id = sanitizeUserText(targetId, 80);
  return {
    purpose: UR_THANKS_STAMPS_PURPOSE,
    posts: walls
      .filter((row) => row.targetType === targetType && row.targetId === id)
      .slice(0, 40)
      .map((row) => ({
        id: row.id,
        mark: row.design.mark,
        name: row.design.name,
        colorHex: row.design.colorHex,
        fromName: row.fromName,
        note: row.note,
        at: row.at,
      })),
  };
}

export function _resetThanksStampsForTests(): void {
  inventory.clear();
  walls.length = 0;
}
