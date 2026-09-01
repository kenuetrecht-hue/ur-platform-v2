/**
 * Amazon Associates + Walmart Affiliates — allowed hosts and listing categories.
 * Owner pastes official product URLs; tracking tags come from .env after program approval.
 */

export type AffiliateNetwork = "amazon_associates" | "walmart_affiliate";

export const AFFILIATE_CATEGORY_STARTERS = [
  { id: "lighting", label: "Creator lighting", hint: "Ring lights, key lights, LED panels" },
  { id: "audio", label: "Microphones & audio", hint: "Lavalier, USB mics, interfaces" },
  { id: "camera", label: "Webcams & cameras", hint: "1080p/4K webcams, phone cages" },
  { id: "desk", label: "Desk & streaming gear", hint: "Arms, mats, stream decks, mounts" },
  { id: "apparel", label: "Everyday apparel", hint: "Tees, hoodies, hats — complement UR merch" },
  { id: "home", label: "Home & kitchen", hint: "Walmart-heavy catalog for everyday shoppers" },
  { id: "office", label: "Office & school", hint: "Notebooks, chairs, monitors" },
] as const;

const AMAZON_HOSTS = /^(?:www\.)?(?:amazon\.[a-z.]+|amzn\.to|a\.co)$/i;
const WALMART_HOSTS = /^(?:www\.)?(?:walmart\.[a-z.]+)$/i;

export function affiliateNetworkFromUrl(raw: string): AffiliateNetwork | null {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (AMAZON_HOSTS.test(host)) return "amazon_associates";
    if (WALMART_HOSTS.test(host)) return "walmart_affiliate";
    return null;
  } catch {
    return null;
  }
}

export function isAllowedAffiliateProductUrl(raw: string, network: AffiliateNetwork): boolean {
  const detected = affiliateNetworkFromUrl(raw);
  return detected === network;
}

export function isUnsetOrPlaceholderEnv(value: string | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  return (
    lower.startsWith("your-") ||
    lower.includes("placeholder") ||
    lower === "changeme" ||
    lower === "replace_me" ||
    lower === "xxx"
  );
}

export const OWNER_DIGITAL_KINDS = ["ebook", "song", "merch", "other"] as const;
export type OwnerDigitalKind = (typeof OWNER_DIGITAL_KINDS)[number];

export const OWNER_DIGITAL_KIND_LABEL: Record<OwnerDigitalKind, string> = {
  ebook: "E-book",
  song: "Song / audio",
  merch: "Physical merch",
  other: "Other",
};
