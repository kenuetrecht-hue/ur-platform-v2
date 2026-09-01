/**
 * Timestamped conduct signatures, no-refund purchase checks, and English communication copies.
 * In-memory until persisted. Owner-only review of member communications.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CONDUCT_RULES_VERSION,
  CONDUCT_UNSIGNED_MESSAGE,
  PURCHASE_NO_REFUND_REQUIRED_MESSAGE,
} from "../../lib/platform-terms-of-use";
import { sanitizeUserText } from "./input-sanitize";
import { toEnglishForOwner } from "./owner-command-center-service";
import { inferSpokenLanguage } from "./spoken-language";

export const acceptedNoRefundSchema = z.literal(true, {
  errorMap: () => ({ message: PURCHASE_NO_REFUND_REQUIRED_MESSAGE }),
});

export type ConductChannel =
  | "ai_chat"
  | "direct_message"
  | "social_post"
  | "talk_transcript"
  | "ur_world";

export type ConductAcceptanceRecord = {
  id: string;
  userId: string;
  userEmail?: string;
  version: string;
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
};

export type PurchaseNoRefundAck = {
  id: string;
  userId: string;
  userEmail?: string;
  sku: string;
  amountCents: number;
  acceptedAt: string;
  ipAddress?: string;
};

export type CommunicationAuditRecord = {
  id: string;
  createdAt: string;
  channel: ConductChannel;
  userId: string;
  userEmail?: string;
  peerId?: string;
  originalLanguage: string;
  original: string;
  english: string;
  translated: boolean;
};

const acceptances = new Map<string, ConductAcceptanceRecord>();
const purchaseAcks: PurchaseNoRefundAck[] = [];
const communications: CommunicationAuditRecord[] = [];

const MAX_COMMS = 5_000;
const MAX_PURCHASE_ACKS = 10_000;

export function hasAcceptedCurrentConduct(userId: string): boolean {
  const row = acceptances.get(userId);
  return Boolean(row && row.version === CONDUCT_RULES_VERSION);
}

export function getConductStatus(userId: string): {
  version: string;
  accepted: boolean;
  acceptedAt: string | null;
} {
  const row = acceptances.get(userId);
  const accepted = Boolean(row && row.version === CONDUCT_RULES_VERSION);
  return {
    version: CONDUCT_RULES_VERSION,
    accepted,
    acceptedAt: accepted ? row!.acceptedAt : null,
  };
}

export function recordConductAcceptance(params: {
  userId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}): ConductAcceptanceRecord {
  const record: ConductAcceptanceRecord = {
    id: randomUUID(),
    userId: params.userId,
    userEmail: params.userEmail,
    version: CONDUCT_RULES_VERSION,
    acceptedAt: new Date().toISOString(),
    ipAddress: params.ipAddress,
    userAgent: params.userAgent ? sanitizeUserText(params.userAgent, 240) : undefined,
  };
  acceptances.set(params.userId, record);
  return record;
}

export function assertConductAccepted(params: { userId: string; isPlatformOwner?: boolean }): void {
  if (params.isPlatformOwner) return;
  if (hasAcceptedCurrentConduct(params.userId)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: CONDUCT_UNSIGNED_MESSAGE });
}

export function assertAndRecordNoRefundAck(params: {
  userId: string;
  userEmail?: string;
  sku: string;
  amountCents: number;
  acceptedNoRefund: true;
  ipAddress?: string;
}): PurchaseNoRefundAck {
  const record: PurchaseNoRefundAck = {
    id: randomUUID(),
    userId: params.userId,
    userEmail: params.userEmail,
    sku: sanitizeUserText(params.sku, 80),
    amountCents: params.amountCents,
    acceptedAt: new Date().toISOString(),
    ipAddress: params.ipAddress,
  };
  purchaseAcks.push(record);
  if (purchaseAcks.length > MAX_PURCHASE_ACKS) {
    purchaseAcks.splice(0, purchaseAcks.length - MAX_PURCHASE_ACKS);
  }
  return record;
}

export async function recordCommunicationForOwner(params: {
  channel: ConductChannel;
  userId: string;
  userEmail?: string;
  peerId?: string;
  original: string;
}): Promise<CommunicationAuditRecord> {
  const original = sanitizeUserText(params.original, 4000);
  const converted = await toEnglishForOwner(original);
  const record: CommunicationAuditRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    channel: params.channel,
    userId: params.userId,
    userEmail: params.userEmail,
    peerId: params.peerId,
    originalLanguage: inferSpokenLanguage(original),
    original,
    english: converted.english,
    translated: converted.translated || original !== converted.english,
  };
  communications.unshift(record);
  if (communications.length > MAX_COMMS) communications.length = MAX_COMMS;
  return record;
}

export function listConductAcceptancesForOwner(limit = 100): ConductAcceptanceRecord[] {
  return [...acceptances.values()]
    .sort((a, b) => b.acceptedAt.localeCompare(a.acceptedAt))
    .slice(0, Math.min(limit, 200));
}

export function listPurchaseAcksForOwner(limit = 100): PurchaseNoRefundAck[] {
  return [...purchaseAcks].reverse().slice(0, Math.min(limit, 200));
}

export function listCommunicationsForOwner(params?: {
  limit?: number;
  channel?: ConductChannel;
}): CommunicationAuditRecord[] {
  const limit = Math.min(params?.limit ?? 80, 200);
  const rows = params?.channel
    ? communications.filter((c) => c.channel === params.channel)
    : communications;
  return rows.slice(0, limit);
}

export function _resetConductLedgerForTests(): void {
  acceptances.clear();
  purchaseAcks.length = 0;
  communications.length = 0;
}
