/**
 * UR World City Wallet packs and plot license list (USD cents).
 * Packs are never exactly $5.00 so they stay on web Stripe / simulated web checkout.
 */

export const UR_WORLD_MAX_LICENSES_PER_USER = 4;

export const UR_WORLD_WALLET_PACKS = [
  { id: "wallet_10", label: "$10 City Wallet", priceCents: 1000, creditCents: 1000 },
  { id: "wallet_25", label: "$25 City Wallet", priceCents: 2500, creditCents: 2500 },
  { id: "wallet_50", label: "$50 City Wallet", priceCents: 5000, creditCents: 5000 },
  { id: "wallet_100", label: "$100 City Wallet", priceCents: 10000, creditCents: 10000 },
] as const;

export type UrWorldWalletPackId = (typeof UR_WORLD_WALLET_PACKS)[number]["id"];

export const UR_WORLD_UPKEEP_CENTS = 499;
export const UR_WORLD_REMODEL_CENTS = 1499;

export type UrWorldPlotSeed = {
  id: string;
  name: string;
  district: string;
  priceCents: number;
  x: number;
  z: number;
};

/** Plaza lots around HQ — entertainment licenses only. */
export const UR_WORLD_PLOT_SEEDS: UrWorldPlotSeed[] = [
  { id: "plaza-a1", name: "Plaza A1", district: "Plaza", priceCents: 1999, x: -18, z: -12 },
  { id: "plaza-a2", name: "Plaza A2", district: "Plaza", priceCents: 1999, x: -6, z: -18 },
  { id: "plaza-a3", name: "Plaza A3", district: "Plaza", priceCents: 2499, x: 6, z: -18 },
  { id: "plaza-a4", name: "Plaza A4", district: "Plaza", priceCents: 2499, x: 18, z: -12 },
  { id: "plaza-b1", name: "Plaza B1", district: "Plaza", priceCents: 2999, x: 18, z: 8 },
  { id: "plaza-b2", name: "Plaza B2", district: "Plaza", priceCents: 2999, x: 8, z: 18 },
  { id: "plaza-b3", name: "Plaza B3", district: "Studio row", priceCents: 3999, x: -8, z: 18 },
  { id: "plaza-b4", name: "Plaza B4", district: "Studio row", priceCents: 3999, x: -18, z: 8 },
  { id: "shop-c1", name: "Kiosk C1", district: "Market lane", priceCents: 4999, x: -28, z: 0 },
  { id: "shop-c2", name: "Kiosk C2", district: "Market lane", priceCents: 4999, x: 28, z: 0 },
];

export function getWalletPack(id: string): (typeof UR_WORLD_WALLET_PACKS)[number] | undefined {
  return UR_WORLD_WALLET_PACKS.find((p) => p.id === id);
}

export function formatWorldUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
