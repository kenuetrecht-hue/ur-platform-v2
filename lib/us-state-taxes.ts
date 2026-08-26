/**
 * US state sales tax & fees for digital AI services (subscriptions, talk packs).
 *
 * Rates are estimated combined state + local averages where digital SaaS is taxable.
 * UR Platform LLC remits collected tax; customers see itemized tax per their billing state.
 *
 * Production: replace with Stripe Tax or a certified tax engine for live rates.
 */

export type UsStateCode =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "DC" | "FL"
  | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME"
  | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH"
  | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI"
  | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY";

export type StateTaxConfig = {
  code: UsStateCode;
  name: string;
  /** Whether digital AI/SaaS access is subject to sales tax in this state */
  taxesDigitalServices: boolean;
  /** Combined estimated rate in basis points (e.g. 825 = 8.25%) */
  combinedRateBps: number;
  /** Optional flat per-transaction state/regulatory fee in cents */
  flatFeeCents: number;
  flatFeeLabel?: string;
  taxLabel: string;
  notes?: string;
};

export const US_STATE_TAX_CONFIG: Record<UsStateCode, StateTaxConfig> = {
  AL: { code: "AL", name: "Alabama", taxesDigitalServices: true, combinedRateBps: 900, flatFeeCents: 0, taxLabel: "Alabama sales tax" },
  AK: { code: "AK", name: "Alaska", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "Alaska sales tax", notes: "No state sales tax; local taxes may apply in some municipalities." },
  AZ: { code: "AZ", name: "Arizona", taxesDigitalServices: true, combinedRateBps: 856, flatFeeCents: 0, taxLabel: "Arizona transaction privilege tax" },
  AR: { code: "AR", name: "Arkansas", taxesDigitalServices: true, combinedRateBps: 950, flatFeeCents: 0, taxLabel: "Arkansas sales tax" },
  CA: { code: "CA", name: "California", taxesDigitalServices: true, combinedRateBps: 725, flatFeeCents: 0, taxLabel: "California sales tax" },
  CO: { code: "CO", name: "Colorado", taxesDigitalServices: true, combinedRateBps: 290, flatFeeCents: 0, taxLabel: "Colorado sales tax" },
  CT: { code: "CT", name: "Connecticut", taxesDigitalServices: true, combinedRateBps: 635, flatFeeCents: 0, taxLabel: "Connecticut sales tax" },
  DE: { code: "DE", name: "Delaware", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "Delaware sales tax", notes: "Delaware has no state sales tax." },
  DC: { code: "DC", name: "District of Columbia", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "DC sales tax" },
  FL: { code: "FL", name: "Florida", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "Florida sales tax" },
  GA: { code: "GA", name: "Georgia", taxesDigitalServices: true, combinedRateBps: 740, flatFeeCents: 0, taxLabel: "Georgia sales tax" },
  HI: { code: "HI", name: "Hawaii", taxesDigitalServices: true, combinedRateBps: 450, flatFeeCents: 0, taxLabel: "Hawaii general excise tax" },
  ID: { code: "ID", name: "Idaho", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "Idaho sales tax" },
  IL: { code: "IL", name: "Illinois", taxesDigitalServices: true, combinedRateBps: 825, flatFeeCents: 0, taxLabel: "Illinois sales tax" },
  IN: { code: "IN", name: "Indiana", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "Indiana sales tax" },
  IA: { code: "IA", name: "Iowa", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "Iowa sales tax" },
  KS: { code: "KS", name: "Kansas", taxesDigitalServices: true, combinedRateBps: 865, flatFeeCents: 0, taxLabel: "Kansas sales tax" },
  KY: { code: "KY", name: "Kentucky", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "Kentucky sales tax" },
  LA: { code: "LA", name: "Louisiana", taxesDigitalServices: true, combinedRateBps: 995, flatFeeCents: 0, taxLabel: "Louisiana sales tax" },
  ME: { code: "ME", name: "Maine", taxesDigitalServices: true, combinedRateBps: 550, flatFeeCents: 0, taxLabel: "Maine sales tax" },
  MD: { code: "MD", name: "Maryland", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "Maryland sales tax" },
  MA: { code: "MA", name: "Massachusetts", taxesDigitalServices: true, combinedRateBps: 625, flatFeeCents: 0, taxLabel: "Massachusetts sales tax" },
  MI: { code: "MI", name: "Michigan", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "Michigan sales tax" },
  MN: { code: "MN", name: "Minnesota", taxesDigitalServices: true, combinedRateBps: 825, flatFeeCents: 0, taxLabel: "Minnesota sales tax" },
  MS: { code: "MS", name: "Mississippi", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "Mississippi sales tax" },
  MO: { code: "MO", name: "Missouri", taxesDigitalServices: true, combinedRateBps: 822, flatFeeCents: 0, taxLabel: "Missouri sales tax" },
  MT: { code: "MT", name: "Montana", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "Montana sales tax", notes: "Montana has no state sales tax." },
  NE: { code: "NE", name: "Nebraska", taxesDigitalServices: true, combinedRateBps: 695, flatFeeCents: 0, taxLabel: "Nebraska sales tax" },
  NV: { code: "NV", name: "Nevada", taxesDigitalServices: true, combinedRateBps: 825, flatFeeCents: 0, taxLabel: "Nevada sales tax" },
  NH: { code: "NH", name: "New Hampshire", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "New Hampshire sales tax", notes: "New Hampshire has no state sales tax." },
  NJ: { code: "NJ", name: "New Jersey", taxesDigitalServices: true, combinedRateBps: 663, flatFeeCents: 0, taxLabel: "New Jersey sales tax" },
  NM: { code: "NM", name: "New Mexico", taxesDigitalServices: true, combinedRateBps: 763, flatFeeCents: 0, taxLabel: "New Mexico gross receipts tax" },
  NY: { code: "NY", name: "New York", taxesDigitalServices: true, combinedRateBps: 800, flatFeeCents: 0, taxLabel: "New York sales tax" },
  NC: { code: "NC", name: "North Carolina", taxesDigitalServices: true, combinedRateBps: 698, flatFeeCents: 0, taxLabel: "North Carolina sales tax" },
  ND: { code: "ND", name: "North Dakota", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "North Dakota sales tax" },
  OH: { code: "OH", name: "Ohio", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "Ohio sales tax", notes: "Digital access services are generally not taxed in Ohio." },
  OK: { code: "OK", name: "Oklahoma", taxesDigitalServices: true, combinedRateBps: 890, flatFeeCents: 0, taxLabel: "Oklahoma sales tax" },
  OR: { code: "OR", name: "Oregon", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "Oregon sales tax", notes: "Oregon has no state sales tax." },
  PA: { code: "PA", name: "Pennsylvania", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "Pennsylvania sales tax" },
  RI: { code: "RI", name: "Rhode Island", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "Rhode Island sales tax" },
  SC: { code: "SC", name: "South Carolina", taxesDigitalServices: true, combinedRateBps: 700, flatFeeCents: 0, taxLabel: "South Carolina sales tax" },
  SD: { code: "SD", name: "South Dakota", taxesDigitalServices: true, combinedRateBps: 645, flatFeeCents: 0, taxLabel: "South Dakota sales tax" },
  TN: { code: "TN", name: "Tennessee", taxesDigitalServices: true, combinedRateBps: 950, flatFeeCents: 0, taxLabel: "Tennessee sales tax" },
  TX: { code: "TX", name: "Texas", taxesDigitalServices: true, combinedRateBps: 825, flatFeeCents: 0, taxLabel: "Texas sales tax" },
  UT: { code: "UT", name: "Utah", taxesDigitalServices: true, combinedRateBps: 719, flatFeeCents: 0, taxLabel: "Utah sales tax" },
  VT: { code: "VT", name: "Vermont", taxesDigitalServices: true, combinedRateBps: 600, flatFeeCents: 0, taxLabel: "Vermont sales tax" },
  VA: { code: "VA", name: "Virginia", taxesDigitalServices: false, combinedRateBps: 0, flatFeeCents: 0, taxLabel: "Virginia sales tax", notes: "Digital access services are generally not taxed in Virginia." },
  WA: { code: "WA", name: "Washington", taxesDigitalServices: true, combinedRateBps: 925, flatFeeCents: 0, taxLabel: "Washington sales tax" },
  WV: { code: "WV", name: "West Virginia", taxesDigitalServices: true, combinedRateBps: 650, flatFeeCents: 0, taxLabel: "West Virginia sales tax" },
  WI: { code: "WI", name: "Wisconsin", taxesDigitalServices: true, combinedRateBps: 540, flatFeeCents: 0, taxLabel: "Wisconsin sales tax" },
  WY: { code: "WY", name: "Wyoming", taxesDigitalServices: true, combinedRateBps: 400, flatFeeCents: 0, taxLabel: "Wyoming sales tax" },
};

export const US_STATE_LIST = Object.values(US_STATE_TAX_CONFIG).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function normalizeStateCode(input: string | null | undefined): UsStateCode | null {
  if (!input) return null;
  const code = input.trim().toUpperCase() as UsStateCode;
  return code in US_STATE_TAX_CONFIG ? code : null;
}

export function getStateTaxConfig(stateCode: string | null | undefined): StateTaxConfig | null {
  const code = normalizeStateCode(stateCode);
  return code ? US_STATE_TAX_CONFIG[code] : null;
}

export type StateTaxBreakdown = {
  stateCode: UsStateCode;
  stateName: string;
  salesTaxCents: number;
  salesTaxLabel: string;
  salesTaxRateDisplay: string;
  stateFeeCents: number;
  stateFeeLabel?: string;
  taxable: boolean;
  notes?: string;
};

export function calculateStateTaxAndFees(
  subtotalCents: number,
  stateCode: string | null | undefined,
): StateTaxBreakdown | null {
  const config = getStateTaxConfig(stateCode);
  if (!config) return null;

  const taxable = config.taxesDigitalServices && config.combinedRateBps > 0;
  const salesTaxCents = taxable
    ? Math.round((subtotalCents * config.combinedRateBps) / 10000)
    : 0;
  const ratePercent = (config.combinedRateBps / 100).toFixed(2);

  return {
    stateCode: config.code,
    stateName: config.name,
    salesTaxCents,
    salesTaxLabel: config.taxLabel,
    salesTaxRateDisplay: taxable ? `${ratePercent}%` : "0%",
    stateFeeCents: config.flatFeeCents,
    stateFeeLabel: config.flatFeeLabel,
    taxable,
    notes: config.notes,
  };
}
