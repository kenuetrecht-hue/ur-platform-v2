/**
 * UR social stamps — buy 4 stickers per $1 and use them like emojis on the feed.
 * Gift unused once, or stick one on a post / page. Not cash, not a tip, not a donation.
 */

import { getRequiredPaymentChannel } from "./payment-channel-policy";

export const UR_THANKS_STAMPS_PER_DOLLAR = 4;

export const UR_THANKS_STAMP_PACKS = [
  { id: "thanks_1", label: "$1 · 4 stamps", priceCents: 100, dollars: 1, includeMonthSeal: false },
  { id: "thanks_2", label: "$2 · 8 stamps", priceCents: 200, dollars: 2, includeMonthSeal: false },
  { id: "thanks_4", label: "$4 · 16 stamps", priceCents: 400, dollars: 4, includeMonthSeal: false },
  { id: "thanks_5", label: "$5 · 20 stamps", priceCents: 500, dollars: 5, includeMonthSeal: false },
  { id: "thanks_10", label: "$10 · 40 stamps", priceCents: 1000, dollars: 10, includeMonthSeal: false },
  { id: "thanks_20", label: "$20 · 80 stamps + month seal", priceCents: 2000, dollars: 20, includeMonthSeal: true },
  { id: "thanks_25", label: "$25 · 100 stamps + month seal", priceCents: 2500, dollars: 25, includeMonthSeal: true },
] as const;

export type UrThanksStampPackId = (typeof UR_THANKS_STAMP_PACKS)[number]["id"];

export type ThanksStampDesign = {
  id: string;
  name: string;
  mark: string;
  colorHex: string;
};

const WEEKLY_SETS: readonly { id: string; name: string; stamps: readonly ThanksStampDesign[] }[] = [
  {
    id: "civic-dawn",
    name: "Civic Dawn",
    stamps: [
      { id: "lamp", name: "Night lamp", mark: "✶", colorHex: "#818CF8" },
      { id: "fountain", name: "Fountain", mark: "◎", colorHex: "#4F8CFF" },
      { id: "star", name: "Civic star", mark: "✦", colorHex: "#C9A227" },
      { id: "hall", name: "Hall door", mark: "▣", colorHex: "#7C3AED" },
    ],
  },
  {
    id: "glow-bar",
    name: "Glow Bar",
    stamps: [
      { id: "stool", name: "Bar stool", mark: "◇", colorHex: "#A78BFA" },
      { id: "glass", name: "Glow glass", mark: "◍", colorHex: "#818CF8" },
      { id: "neon", name: "Neon trim", mark: "▭", colorHex: "#4F46E5" },
      { id: "coin", name: "Well coin", mark: "◉", colorHex: "#C4B5FD" },
    ],
  },
  {
    id: "night-garden",
    name: "Night garden",
    stamps: [
      { id: "leaf", name: "Garden leaf", mark: "✿", colorHex: "#34D399" },
      { id: "bloom", name: "Night bloom", mark: "❀", colorHex: "#A78BFA" },
      { id: "moon", name: "Path moon", mark: "☾", colorHex: "#C7D2FE" },
      { id: "path", name: "Stone path", mark: "▬", colorHex: "#8A8374" },
    ],
  },
  {
    id: "language-walk",
    name: "Language Walk",
    stamps: [
      { id: "book", name: "Phrase book", mark: "▤", colorHex: "#2A7F6F" },
      { id: "pin", name: "Travel pin", mark: "⌖", colorHex: "#C45C26" },
      { id: "map", name: "Street map", mark: "▦", colorHex: "#4F46E5" },
      { id: "ear", name: "Listen", mark: "◎", colorHex: "#818CF8" },
    ],
  },
  {
    id: "trade-yard",
    name: "Trade Yard",
    stamps: [
      { id: "wrench", name: "Wrench wrap", mark: "⚒", colorHex: "#C9A227" },
      { id: "meter", name: "Meter", mark: "◔", colorHex: "#4F46E5" },
      { id: "glove", name: "Work glove", mark: "▣", colorHex: "#6B4A32" },
      { id: "bolt", name: "Bolt", mark: "⚡", colorHex: "#FBBF24" },
    ],
  },
  {
    id: "the-line",
    name: "The Line",
    stamps: [
      { id: "whisk", name: "Whisk", mark: "✺", colorHex: "#C45C26" },
      { id: "plate", name: "Plate", mark: "○", colorHex: "#E7E0D4" },
      { id: "steam", name: "Steam", mark: "〰", colorHex: "#A78BFA" },
      { id: "herb", name: "Herb", mark: "☘", colorHex: "#16A34A" },
    ],
  },
  {
    id: "harbor",
    name: "Harbor",
    stamps: [
      { id: "wave", name: "Wave", mark: "∼", colorHex: "#38BDF8" },
      { id: "lamp", name: "Pier lamp", mark: "✶", colorHex: "#F59E0B" },
      { id: "knot", name: "Line knot", mark: "∞", colorHex: "#4F46E5" },
      { id: "gull", name: "Gull", mark: "∧", colorHex: "#E2E8F0" },
    ],
  },
  {
    id: "fields",
    name: "Fields",
    stamps: [
      { id: "seed", name: "Seed", mark: "•", colorHex: "#A3E635" },
      { id: "sun", name: "Field sun", mark: "☀", colorHex: "#FBBF24" },
      { id: "crate", name: "Crate", mark: "▢", colorHex: "#92400E" },
      { id: "rain", name: "Soft rain", mark: "☔", colorHex: "#60A5FA" },
    ],
  },
] as const;

const MONTH_SEALS: readonly string[] = [
  "Frost",
  "Thaw",
  "Sprout",
  "Bloom",
  "Warmth",
  "Solstice",
  "Harvest start",
  "Late heat",
  "Equinox",
  "Hearth",
  "Lantern",
  "Ember",
];

export function isoWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function getWeeklyThanksSet(at = new Date()) {
  const set = WEEKLY_SETS[isoWeekNumber(at) % WEEKLY_SETS.length]!;
  return {
    id: set.id,
    name: set.name,
    week: isoWeekNumber(at),
    stamps: set.stamps.map((s) => ({ ...s, id: `${set.id}-${s.id}` })),
  };
}

export function getMonthlyThanksSeal(at = new Date()): ThanksStampDesign {
  const month = at.getUTCMonth();
  const year = at.getUTCFullYear();
  const name = MONTH_SEALS[month] ?? "Season";
  return {
    id: `month-${year}-${month + 1}`,
    name: `${name} seal`,
    mark: "✪",
    colorHex: "#C9A227",
  };
}

export function getThanksStampPack(id: string) {
  return UR_THANKS_STAMP_PACKS.find((p) => p.id === id);
}

export function thanksStampCountForPack(pack: (typeof UR_THANKS_STAMP_PACKS)[number]): number {
  return pack.dollars * UR_THANKS_STAMPS_PER_DOLLAR + (pack.includeMonthSeal ? 1 : 0);
}

export function thanksStampPackChannel(priceCents: number) {
  return getRequiredPaymentChannel(priceCents);
}

export function isThanksStampPackAllowedOnPlatform(
  pack: (typeof UR_THANKS_STAMP_PACKS)[number],
  clientPlatform: "web" | "native",
): boolean {
  const channel = clientPlatform === "web" ? "web_browser" : "in_app";
  return thanksStampPackChannel(pack.priceCents) === channel;
}

export function listThanksStampPacksForPlatform(clientPlatform: "web" | "native") {
  return UR_THANKS_STAMP_PACKS.filter((pack) => isThanksStampPackAllowedOnPlatform(pack, clientPlatform));
}

export const UR_THANKS_STAMPS_PURPOSE =
  "Social stamps are digital stickers you buy to use like emojis. Four stamps per dollar. " +
  "The $5 pack (20 stamps) is an in-app purchase on iPhone and Android so Apple and Google stay happy. " +
  "Other packs are on the website. Pass unused once to a friend, or stick one on a post, a member page, or an AI page. " +
  "They are not tips, not cash, not City Wallet, not plaza look tips, not a charity donation, not tax-deductible, " +
  "and not an investment. No resale. No cash-out. Creators do not get a payout from a stamp. Use the Tip button to send money.";

export const UR_THANKS_STAMPS_STEWARD_NOTES = `
## Social stamps (mandatory for Business Steward — not tips)
Emoji-style stickers for the social feed. **4 stamps per $1.**
**$5 · 20 stamps** is the App Store / Google Play in-app pack (same $5.00 slot as Talk Time). Other packs: $1, $2, $4, $10, $20, $25 on the website.
Weekly featured quartet rotates. $20 and $25 packs also include that month’s seal.
Members pass unused stamps once to a KYC’d UR account, or stick one on a post / page — like an emoji, not like money.
Do not call them tips or donations. Do not say they pay the creator. Creator money uses the separate Tip button (100% to the creator; fan pays Stripe).
Do not mix with plaza look tips or old “6 stamps = AI day” currency.
A new weekly set is automatic. Do not run a loot box or mystery pack. Members see the four designs before they buy.
`.trim();
