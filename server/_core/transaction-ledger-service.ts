/**
 * Immutable ledger — every platform transaction recorded with payer, payee, and link attribution.
 */

import { randomUUID } from "crypto";

export type LedgerTransactionType =
  | "live_class_ticket"
  | "class_replay_ticket"
  | "affiliate_bonus"
  | "owner_comp"
  | "sandbox_upgrade"
  | "tip"
  | "creator_payout"
  | "other";

export type LedgerTransactionStatus = "completed" | "pending" | "failed" | "refunded";

export type LedgerTransaction = {
  id: string;
  type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  amountCents: number;
  currency: string;
  description: string;
  payerUserId?: string;
  payerEmail?: string;
  payeeUserId?: string;
  payeeEmail?: string;
  affiliateUserId?: string;
  affiliateSlug?: string;
  sessionId?: string;
  creatorAiId?: string;
  paymentIntentId?: string;
  attributionSlug?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
};

const ledger: LedgerTransaction[] = [];

export function recordTransaction(params: {
  type: LedgerTransactionType;
  status?: LedgerTransactionStatus;
  amountCents: number;
  currency?: string;
  description: string;
  payerUserId?: string;
  payerEmail?: string;
  payeeUserId?: string;
  payeeEmail?: string;
  affiliateUserId?: string;
  affiliateSlug?: string;
  sessionId?: string;
  creatorAiId?: string;
  paymentIntentId?: string;
  attributionSlug?: string;
  metadata?: Record<string, string | number | boolean>;
}): LedgerTransaction {
  const tx: LedgerTransaction = {
    id: randomUUID(),
    type: params.type,
    status: params.status ?? "completed",
    amountCents: params.amountCents,
    currency: params.currency ?? "USD",
    description: params.description,
    payerUserId: params.payerUserId,
    payerEmail: params.payerEmail,
    payeeUserId: params.payeeUserId,
    payeeEmail: params.payeeEmail,
    affiliateUserId: params.affiliateUserId,
    affiliateSlug: params.affiliateSlug,
    sessionId: params.sessionId,
    creatorAiId: params.creatorAiId,
    paymentIntentId: params.paymentIntentId,
    attributionSlug: params.attributionSlug,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
  };
  ledger.push(tx);
  return tx;
}

export function getTransaction(transactionId: string): LedgerTransaction | null {
  return ledger.find((t) => t.id === transactionId) ?? null;
}

export function listAllTransactions(opts?: {
  limit?: number;
  userId?: string;
}): LedgerTransaction[] {
  let list = [...ledger];
  if (opts?.userId) {
    const uid = opts.userId;
    list = list.filter(
      (t) => t.payerUserId === uid || t.payeeUserId === uid || t.affiliateUserId === uid,
    );
  }
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (opts?.limit) list = list.slice(0, opts.limit);
  return list;
}

export function getTransactionStats(userId?: string) {
  const list = listAllTransactions(userId ? { userId } : undefined);
  const completed = list.filter((t) => t.status === "completed");
  return {
    totalTransactions: completed.length,
    totalVolumeCents: completed.reduce((s, t) => s + t.amountCents, 0),
    asPayer: completed.filter((t) => t.payerUserId === userId).length,
    asPayee: completed.filter((t) => t.payeeUserId === userId).length,
    asAffiliate: completed.filter((t) => t.affiliateUserId === userId).length,
  };
}

export function formatTransactionForDisplay(tx: LedgerTransaction) {
  return {
    ...tx,
    amountUsd: (tx.amountCents / 100).toFixed(2),
    createdAtLabel: new Date(tx.createdAt).toLocaleString(),
  };
}
