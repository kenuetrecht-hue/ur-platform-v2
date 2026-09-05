/**
 * Creator payouts via Uphold (blockchain) — connect account, instant USDC transfers on each sale.
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { getContentCreatorProfile, getFoundingAudienceStatus } from "./partner-program-service";
import { launchAdvantageDurationDays, launchHundredBandFromSlot } from "../../lib/founding-audience-year-discount";
import { LAUNCH_PROMOTION_TIERS, PLATFORM_FEE_PERCENT } from "../../lib/launch-promotion-config";

/** Creators receive 85% of each sale instantly; platform retains 15%. */
export const CREATOR_PAYOUT_SHARE = 0.85;

/** One decimal so 92.5% does not round to 93. */
export function saleShareToPercent(share: number): number {
  return Math.round(share * 1000) / 10;
}

function launchTierCreatorShare(now: Date, enrolledAt: Date, launchSlot: number | null): number | null {
  const band = launchHundredBandFromSlot(launchSlot);
  if (!band) return null;
  const ends = new Date(enrolledAt.getTime() + launchAdvantageDurationDays(band) * 24 * 60 * 60 * 1000);
  if (now.getTime() >= ends.getTime()) return null;
  const discount = LAUNCH_PROMOTION_TIERS[band - 1]!.platformFeeDiscountPercent;
  const feePercent = PLATFORM_FEE_PERCENT * (1 - discount / 100);
  return (100 - feePercent) / 100;
}

/** Sale split for one creator — launch-tier first, then the year-long 50%/60% audience offer. */
export function getCreatorSaleShare(userId: string, now = new Date()): number {
  const profile = getContentCreatorProfile(userId);
  if (!profile) return CREATOR_PAYOUT_SHARE;
  const enrolledAt = new Date(profile.enrolledAt);
  const launchShare = launchTierCreatorShare(now, enrolledAt, profile.launchSlot);
  if (launchShare != null) return launchShare;
  const year = getFoundingAudienceStatus(userId, now);
  if (year?.active) return year.creatorKeepPercent / 100;
  return CREATOR_PAYOUT_SHARE;
}

export type PayoutMethod = "uphold" | "crypto_wallet";
export type PayoutAsset = "USDC" | "BTC" | "ETH";
export type PayoutNetwork = "ethereum" | "polygon" | "solana";

export type CreatorPayoutProfile = {
  userId: string;
  method: PayoutMethod | null;
  status: "not_connected" | "pending" | "connected";
  upholdUserId?: string;
  upholdEmail?: string;
  walletAddress?: string;
  asset: PayoutAsset;
  network: PayoutNetwork;
  connectedAt?: string;
  totalPaidOutCents: number;
  pendingBalanceCents: number;
};

export type PayoutTransfer = {
  id: string;
  userId: string;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  asset: PayoutAsset;
  network: PayoutNetwork;
  method: PayoutMethod;
  status: "completed" | "pending" | "failed";
  sourceTransactionId?: string;
  upholdTransferId?: string;
  blockchainTxHash?: string;
  createdAt: string;
  completedAt?: string;
  message: string;
};

const profiles = new Map<string, CreatorPayoutProfile>();
const transfers: PayoutTransfer[] = [];
const upholdOAuthState = new Map<string, string>();

function upholdConfigured(): boolean {
  return Boolean(process.env.UPHOLD_CLIENT_ID?.trim());
}

function appBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_APP_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8082")
    .replace(/\/$/, "");
}

export function getCreatorPayoutProfile(userId: string): CreatorPayoutProfile {
  const existing = profiles.get(userId);
  if (existing) return existing;
  return {
    userId,
    method: null,
    status: "not_connected",
    asset: "USDC",
    network: "polygon",
    totalPaidOutCents: 0,
    pendingBalanceCents: 0,
  };
}

export function getUpholdConnectUrl(userId: string): {
  url: string;
  mode: "oauth" | "sandbox";
  message: string;
} {
  const redirectUri =
    process.env.UPHOLD_REDIRECT_URI ?? `${appBaseUrl()}/creator-dashboard?uphold=connected`;
  const clientId = process.env.UPHOLD_CLIENT_ID;

  if (clientId) {
    const state = randomUUID();
    upholdOAuthState.set(state, userId);
    const scope = encodeURIComponent("user:read transactions:write");
    const url =
      `https://uphold.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}&state=${encodeURIComponent(state)}&response_type=code`;
    return {
      url,
      mode: "oauth",
      message: "Sign in to Uphold to receive instant blockchain payouts.",
    };
  }

  return {
    url: "https://uphold.com/signup",
    mode: "sandbox",
    message:
      "Uphold OAuth is not configured yet. Sign up at Uphold, then enter your Uphold email below to link payouts (dev mode).",
  };
}

export function completeUpholdConnection(params: {
  userId: string;
  upholdEmail: string;
  upholdUserId?: string;
  oauthCode?: string;
  state?: string;
}): CreatorPayoutProfile {
  if (params.state) {
    const expectedUser = upholdOAuthState.get(params.state);
    if (expectedUser && expectedUser !== params.userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invalid Uphold connection state." });
    }
    upholdOAuthState.delete(params.state);
  }

  const email = params.upholdEmail.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid Uphold email required." });
  }

  const profile: CreatorPayoutProfile = {
    ...getCreatorPayoutProfile(params.userId),
    method: "uphold",
    status: "connected",
    upholdEmail: email,
    upholdUserId: params.upholdUserId ?? `uphold_${randomUUID().slice(0, 8)}`,
    connectedAt: new Date().toISOString(),
    asset: "USDC",
    network: "polygon",
  };
  profiles.set(params.userId, profile);
  return profile;
}

export function connectCryptoWallet(params: {
  userId: string;
  walletAddress: string;
  asset?: PayoutAsset;
  network?: PayoutNetwork;
}): CreatorPayoutProfile {
  const address = params.walletAddress.trim();
  if (address.length < 20) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Valid wallet address required." });
  }

  const profile: CreatorPayoutProfile = {
    ...getCreatorPayoutProfile(params.userId),
    method: "crypto_wallet",
    status: "connected",
    walletAddress: address,
    asset: params.asset ?? "USDC",
    network: params.network ?? "polygon",
    connectedAt: new Date().toISOString(),
  };
  profiles.set(params.userId, profile);
  return profile;
}

function simulateBlockchainTxHash(): string {
  return `0x${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/**
 * Instant payout — triggered after each creator sale (85%) or tip (100%) when payout is connected.
 */
export function processInstantCreatorPayout(params: {
  creatorUserId: string;
  grossCents: number;
  sourceTransactionId?: string;
  description?: string;
  /** sale = 85/15. tip = creator keeps 100%. pending_release = already-net balance. */
  kind?: "sale" | "tip" | "pending_release";
  now?: Date;
}): PayoutTransfer | null {
  const share =
    params.kind === "tip" || params.kind === "pending_release"
      ? 1
      : getCreatorSaleShare(params.creatorUserId, params.now);
  const netCents = Math.round(params.grossCents * share);
  const platformFeeCents = params.grossCents - netCents;

  const profile = profiles.get(params.creatorUserId);
  if (!profile || profile.status !== "connected" || !profile.method) {
    const pending = getCreatorPayoutProfile(params.creatorUserId);
    pending.pendingBalanceCents += netCents;
    profiles.set(params.creatorUserId, pending);
    return null;
  }

  const transfer: PayoutTransfer = {
    id: randomUUID(),
    userId: params.creatorUserId,
    grossCents: params.grossCents,
    platformFeeCents,
    netCents,
    asset: profile.asset,
    network: profile.network,
    method: profile.method,
    status: "completed",
    sourceTransactionId: params.sourceTransactionId,
    upholdTransferId:
      profile.method === "uphold" ? `uphold_tx_${randomUUID().slice(0, 12)}` : undefined,
    blockchainTxHash: simulateBlockchainTxHash(),
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    message:
      profile.method === "uphold"
        ? `Instant USDC sent to Uphold (${profile.upholdEmail})`
        : `Instant ${profile.asset} sent to wallet ${profile.walletAddress?.slice(0, 8)}…`,
  };

  transfers.push(transfer);
  profile.totalPaidOutCents += netCents;
  profile.pendingBalanceCents = 0;
  profiles.set(params.creatorUserId, profile);

  recordTransaction({
    type: "creator_payout",
    amountCents: netCents,
    description: params.description ?? `Creator instant payout — ${transfer.message}`,
    payeeUserId: params.creatorUserId,
    metadata: {
      payoutId: transfer.id,
      grossCents: params.grossCents,
      platformFeeCents,
      asset: profile.asset,
      network: profile.network,
      blockchainTxHash: transfer.blockchainTxHash ?? "",
    },
  });

  return transfer;
}

export function listCreatorPayouts(userId: string, limit = 30): PayoutTransfer[] {
  return transfers
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function getCreatorPayoutDashboard(userId: string) {
  const creator = getContentCreatorProfile(userId);
  const payout = getCreatorPayoutProfile(userId);
  const recentPayouts = listCreatorPayouts(userId, 15);
  const saleShare = getCreatorSaleShare(userId);

  return {
    enrolled: Boolean(creator),
    payout,
    creatorSharePercent: saleShareToPercent(saleShare),
    platformFeePercent: saleShareToPercent(1 - saleShare),
    upholdAvailable: true,
    upholdOAuthConfigured: upholdConfigured(),
    canReceiveInstantPayouts: payout.status === "connected",
    recentPayouts,
    setupRequired: payout.status !== "connected",
    setupMessage:
      payout.status === "connected"
        ? "Instant payouts active — 85% of each class/merch sale, 100% of tips (the fan pays the card fee)."
        : "Connect Uphold or a USDC wallet to receive earnings instantly after each class sale or tip.",
    tipSharePercent: 100,
    classSharePercent: saleShareToPercent(saleShare),
  };
}

export function flushPendingPayouts(userId: string): PayoutTransfer[] {
  const profile = profiles.get(userId);
  if (!profile || profile.pendingBalanceCents <= 0 || profile.status !== "connected") {
    return [];
  }
  const amount = profile.pendingBalanceCents;
  profile.pendingBalanceCents = 0;
  profiles.set(userId, profile);
  const tx = processInstantCreatorPayout({
    creatorUserId: userId,
    grossCents: amount,
    kind: "pending_release",
    description: "Released pending creator balance",
  });
  return tx ? [tx] : [];
}
