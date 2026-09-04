/**
 * UR World — entertainment city: closed-loop wallet + plot licenses.
 * In-memory until persisted. Checkout follows simulated Stripe path in development.
 */

import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import {
  UR_WORLD_MAX_LICENSES_PER_USER,
  UR_WORLD_PLOT_SEEDS,
  UR_WORLD_REMODEL_CENTS,
  UR_WORLD_UPKEEP_CENTS,
  getWalletPack,
  type UrWorldWalletPackId,
} from "../../lib/ur-world-economy";
import { UR_WORLD_LICENSE_FACT, UR_WORLD_SHORT_FOOTER } from "../../lib/ur-world-disclosures";
import { getLockerSnapshot, _resetUrWorldLockerForTests } from "./ur-world-locker-service";
import { _resetLookFundForTests } from "./ur-world-look-fund-service";

export type PlotLicenseStatus = "available" | "licensed";

export type UrWorldPlot = {
  id: string;
  name: string;
  district: string;
  priceCents: number;
  x: number;
  z: number;
  status: PlotLicenseStatus;
  licenseeUserId?: string;
  licensedAt?: string;
};

export type ConstructionJob = {
  id: string;
  plotId: string;
  userId: string;
  kind: "remodel";
  amountCents: number;
  platformShareCents: number;
  status: "simulated";
  createdAt: string;
};

const wallets = new Map<string, number>();
const plots = new Map<string, UrWorldPlot>();
const jobs: ConstructionJob[] = [];

function seedPlots(): void {
  if (plots.size > 0) return;
  for (const seed of UR_WORLD_PLOT_SEEDS) {
    plots.set(seed.id, { ...seed, status: "available" });
  }
}

seedPlots();

export function getCityWalletBalance(userId: string): number {
  return wallets.get(userId) ?? 0;
}

function debitWallet(userId: string, amountCents: number, label: string): void {
  const bal = getCityWalletBalance(userId);
  if (bal < amountCents) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Not enough City Wallet credit for ${label}. Top up first (closed-loop entertainment credit — not cash).`,
    });
  }
  wallets.set(userId, bal - amountCents);
}

export function creditCityWallet(params: {
  userId: string;
  userEmail: string;
  packId: UrWorldWalletPackId;
}): { balanceCents: number; creditedCents: number } {
  const pack = getWalletPack(params.packId);
  if (!pack) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown City Wallet pack." });
  }
  const next = getCityWalletBalance(params.userId) + pack.creditCents;
  wallets.set(params.userId, next);
  recordTransaction({
    type: "other",
    amountCents: pack.priceCents,
    description: `UR World City Wallet top-up ${pack.label} (entertainment credit, not withdrawable)`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: { urWorld: true, packId: pack.id },
  });
  return { balanceCents: next, creditedCents: pack.creditCents };
}

export function listWorldPlots(): UrWorldPlot[] {
  seedPlots();
  return [...plots.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function countUserLicenses(userId: string): number {
  return listWorldPlots().filter((p) => p.licenseeUserId === userId).length;
}

export function licensePlot(params: {
  userId: string;
  userEmail: string;
  plotId: string;
}): UrWorldPlot {
  seedPlots();
  const plot = plots.get(params.plotId);
  if (!plot) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found." });
  }
  if (plot.status === "licensed") {
    throw new TRPCError({ code: "FORBIDDEN", message: "That plot license is already held." });
  }
  if (countUserLicenses(params.userId) >= UR_WORLD_MAX_LICENSES_PER_USER) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Entertainment cap: at most ${UR_WORLD_MAX_LICENSES_PER_USER} plot licenses per account.`,
    });
  }
  debitWallet(params.userId, plot.priceCents, "this plot license");
  plot.status = "licensed";
  plot.licenseeUserId = params.userId;
  plot.licensedAt = new Date().toISOString();
  plots.set(plot.id, plot);
  recordTransaction({
    type: "other",
    amountCents: plot.priceCents,
    description: `UR World plot license ${plot.name} — ${UR_WORLD_LICENSE_FACT}`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: { urWorld: true, plotId: plot.id },
  });
  return plot;
}

export function payPlotUpkeep(params: {
  userId: string;
  userEmail: string;
  plotId: string;
}): { balanceCents: number } {
  const plot = plots.get(params.plotId);
  if (!plot || plot.licenseeUserId !== params.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only pay upkeep on your own plot license." });
  }
  debitWallet(params.userId, UR_WORLD_UPKEEP_CENTS, "plot upkeep");
  recordTransaction({
    type: "other",
    amountCents: UR_WORLD_UPKEEP_CENTS,
    description: `UR World entertainment upkeep for ${plot.name} (not a government tax)`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: { urWorld: true, plotId: plot.id, kind: "upkeep" },
  });
  return { balanceCents: getCityWalletBalance(params.userId) };
}

export function hireSimulatedRemodel(params: {
  userId: string;
  userEmail: string;
  plotId: string;
}): ConstructionJob {
  const plot = plots.get(params.plotId);
  if (!plot || plot.licenseeUserId !== params.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You can only remodel a plot license you hold." });
  }
  debitWallet(params.userId, UR_WORLD_REMODEL_CENTS, "simulated remodel");
  const job: ConstructionJob = {
    id: `job-${Date.now()}`,
    plotId: plot.id,
    userId: params.userId,
    kind: "remodel",
    amountCents: UR_WORLD_REMODEL_CENTS,
    platformShareCents: UR_WORLD_REMODEL_CENTS,
    status: "simulated",
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  recordTransaction({
    type: "other",
    amountCents: UR_WORLD_REMODEL_CENTS,
    description: `UR World simulated remodel on ${plot.name} (entertainment construction desk)`,
    payerUserId: params.userId,
    payerEmail: params.userEmail,
    metadata: { urWorld: true, plotId: plot.id, kind: "remodel" },
  });
  return job;
}

export function listUserConstructionJobs(userId: string): ConstructionJob[] {
  return jobs.filter((j) => j.userId === userId).slice(-20);
}

export function getUrWorldSnapshot(userId: string, displayName?: string, isPlatformOwner = false) {
  seedPlots();
  const locker = getLockerSnapshot(userId, displayName, isPlatformOwner);
  return {
    footer: UR_WORLD_SHORT_FOOTER,
    balanceCents: getCityWalletBalance(userId),
    licenseCount: countUserLicenses(userId),
    maxLicenses: UR_WORLD_MAX_LICENSES_PER_USER,
    avatar: locker.avatar,
    equipped: locker.equipped,
    cosmeticOwned: locker.owned,
    cosmeticCatalog: locker.catalog,
    ownerTitle: locker.ownerTitle,
    plots: listWorldPlots().map((p) => ({
      ...p,
      isMine: p.licenseeUserId === userId,
    })),
    jobs: listUserConstructionJobs(userId),
  };
}

/** Test helper */
export function _resetUrWorldForTests(): void {
  wallets.clear();
  plots.clear();
  jobs.length = 0;
  seedPlots();
  _resetUrWorldLockerForTests();
  _resetLookFundForTests();
}
