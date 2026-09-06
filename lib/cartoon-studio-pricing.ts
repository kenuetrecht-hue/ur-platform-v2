/**
 * Cartoon Studio prepaid pricing — five plans, cheap to 4K.
 *
 * Customer pays up front. Tax and Stripe are added on top so UR never absorbs them.
 * Film-engine floors use published Veo-class rates × 1.3 retry waste.
 * Lite/Mid use cheaper engine APIs (720p Lite / 1080p Fast). Cinema stays Standard 1080p.
 * Premiere is Standard 4K — highest resolution we can buy, not a Hollywood movie.
 * Never price a SKU at exactly $5.00 (that checkout is mobile in-app only).
 */

import { formatUsd } from "./ai-subscription-pricing";
import { IN_APP_ONLY_SUBTOTAL_CENTS } from "./payment-channel-policy";
import { AI_PURCHASE_NO_REFUND_POLICY } from "./platform-terms-of-use";

export const CARTOON_STUDIO_WEB_PATH = "/cartoon-studio" as const;

export type CartoonStudioTierId = "draft" | "lite" | "mid" | "cinema" | "premiere";

export type CartoonEngineClass = "none" | "lite" | "fast" | "standard" | "standard_4k";

/** Draft: storyboard assemble + editor. Gemini text is pennies; floor covers waste. */
export const DRAFT_COST_FLOOR_CENTS = 11;
/** Veo 3.1 Lite 720p ~5¢/sec × 1.3 waste. */
export const LITE_COST_PER_SECOND_CENTS = 7;
/** Veo 3.1 Fast 1080p ~12¢/sec × 1.3 waste. */
export const MID_COST_PER_SECOND_CENTS = 16;
/** Veo 3.1 Standard 1080p ~40¢/sec × 1.3 waste. */
export const CINEMA_COST_PER_SECOND_CENTS = 52;
/** Veo 3.1 Standard 4K ~60¢/sec × 1.3 waste. */
export const PREMIERE_COST_PER_SECOND_CENTS = 78;
/** Extra buffer so a rounding miss cannot sell at cost. */
export const MIN_GROSS_MARGIN_CENTS = 80;

export const DRAFT_RATE_CENTS_PER_SECOND = 25;
export const DRAFT_MIN_CENTS = 199;
export const DRAFT_MAX_SECONDS = 24;
export const DRAFT_SECOND_OPTIONS = [8, 16, 24] as const;

export const LITE_RATE_CENTS_PER_SECOND = 29;
export const LITE_MIN_CENTS = 249;
export const LITE_MAX_SECONDS = 24;
export const LITE_SECOND_OPTIONS = [8, 16, 24] as const;

export const MID_RATE_CENTS_PER_SECOND = 49;
export const MID_MIN_CENTS = 399;
export const MID_MAX_SECONDS = 32;
export const MID_SECOND_OPTIONS = [8, 16, 24, 32] as const;

export const CINEMA_RATE_CENTS_PER_SECOND = 99;
export const CINEMA_MIN_CENTS = 799;
export const CINEMA_MAX_SECONDS = 32;
export const CINEMA_SECOND_OPTIONS = [8, 16, 24, 32] as const;

export const PREMIERE_RATE_CENTS_PER_SECOND = 149;
export const PREMIERE_MIN_CENTS = 1199;
export const PREMIERE_MAX_SECONDS = 24;
export const PREMIERE_SECOND_OPTIONS = [8, 16, 24] as const;

const COST_PER_SECOND: Record<CartoonStudioTierId, number> = {
  draft: 0,
  lite: LITE_COST_PER_SECOND_CENTS,
  mid: MID_COST_PER_SECOND_CENTS,
  cinema: CINEMA_COST_PER_SECOND_CENTS,
  premiere: PREMIERE_COST_PER_SECOND_CENTS,
};

export const CARTOON_STUDIO_NO_REFUND_POLICY =
  "Cartoon Studio has no return policy. You must be happy with what you receive. " +
  "Payment is final once checkout goes through. No refunds, no replacements, no chargebacks for taste, " +
  "length, style, resolution, or because you changed your mind. Digital studio work is delivered as-is.";

export const CARTOON_STUDIO_PAY_FIRST_RULE =
  "You pay before anything is built. We do not start the storyboard, editor, or film render until checkout is complete.";

export const CARTOON_STUDIO_PRICING_SUMMARY =
  "Cartoon Studio (web checkout): Draft 25¢/sec ($1.99 min) assembled cartoon + editor. " +
  "Lite Motion 29¢/sec ($2.49 min) cheaper 720p engine. Mid Motion 49¢/sec ($3.99 min) 1080p fast engine. " +
  "Cinema 99¢/sec ($7.99 min) 1080p quality engine. Premiere 4K $1.49/sec ($11.99 min) highest-resolution AI film we sell. " +
  "You also pay sales tax and the Stripe card fee. No refunds.";

export type CartoonStudioTier = {
  id: CartoonStudioTierId;
  label: string;
  badge: string;
  engineClass: CartoonEngineClass;
  resolutionLabel: string;
  rateCentsPerSecond: number;
  minCents: number;
  maxSeconds: number;
  secondOptions: readonly number[];
  usedFor: string;
  youGet: string[];
  difference: string;
  costExplained: string;
};

const EDITOR_GET = [
  "AI storyboard from your idea or script",
  "Multi-track editor: scenes, voice, captions, music",
  "Play on the website and in the app",
  "Download the assembled video on the website",
] as const;

export const CARTOON_STUDIO_TIERS: readonly CartoonStudioTier[] = [
  {
    id: "draft",
    label: "Draft Studio",
    badge: "Cheapest",
    engineClass: "none",
    resolutionLabel: "Storyboard stills",
    rateCentsPerSecond: DRAFT_RATE_CENTS_PER_SECOND,
    minCents: DRAFT_MIN_CENTS,
    maxSeconds: DRAFT_MAX_SECONDS,
    secondOptions: DRAFT_SECOND_OPTIONS,
    usedFor:
      "A short assembled cartoon you can edit and download. Best for a first cut or a cheap teaching clip. No film-engine seconds.",
    youGet: [...EDITOR_GET],
    difference:
      "Draft is the cheapest option. It is timed still scenes, not motion film. Lite, Mid, Cinema, and Premiere buy engine seconds. Draft does not.",
    costExplained:
      "25¢ per second, $1.99 minimum. Pays for the storyboard write, the editor, hosting, and UR's margin. Sales tax and Stripe are added on top and paid by you.",
  },
  {
    id: "lite",
    label: "Lite Motion",
    badge: "Low quality · cheap film",
    engineClass: "lite",
    resolutionLabel: "720p class",
    rateCentsPerSecond: LITE_RATE_CENTS_PER_SECOND,
    minCents: LITE_MIN_CENTS,
    maxSeconds: LITE_MAX_SECONDS,
    secondOptions: LITE_SECOND_OPTIONS,
    usedFor:
      "The cheapest motion film. A lower-quality 720p engine API (Lite-class). Best when you want movement without paying Cinema prices.",
    youGet: [...EDITOR_GET, "One prepaid Lite-class film-engine render", "720p-class motion — softer, faster, cheaper"],
    difference:
      "Lite is cheaper than Mid and Cinema because it uses a different, lower-quality engine API. Resolution and polish are lower. That is how we can charge less and still cover the bill.",
    costExplained:
      "29¢ per second, $2.49 minimum. The Lite engine list rate is about 5¢ per second at 720p. We price at 29¢ so retries and UR's margin are covered. Tax and Stripe on top, paid by you.",
  },
  {
    id: "mid",
    label: "Mid Motion",
    badge: "Mid quality",
    engineClass: "fast",
    resolutionLabel: "1080p fast",
    rateCentsPerSecond: MID_RATE_CENTS_PER_SECOND,
    minCents: MID_MIN_CENTS,
    maxSeconds: MID_MAX_SECONDS,
    secondOptions: MID_SECOND_OPTIONS,
    usedFor:
      "A middle film-engine. Faster 1080p-class API. Sharper than Lite, cheaper than Cinema. Best everyday motion clip.",
    youGet: [...EDITOR_GET, "One prepaid Fast-class 1080p film-engine render", "Clearer motion than Lite, not Cinema polish"],
    difference:
      "Mid sits between Lite and Cinema. Same 1080p family as Cinema, but a faster/cheaper engine. You give up some fidelity to pay less.",
    costExplained:
      "49¢ per second, $3.99 minimum. Fast 1080p list rates run about 12¢ per second. We price at 49¢ so the engine bill, waste, and a margin stay covered. Tax and Stripe on top, paid by you.",
  },
  {
    id: "cinema",
    label: "Cinema Engine",
    badge: "High quality · expensive",
    engineClass: "standard",
    resolutionLabel: "1080p quality",
    rateCentsPerSecond: CINEMA_RATE_CENTS_PER_SECOND,
    minCents: CINEMA_MIN_CENTS,
    maxSeconds: CINEMA_MAX_SECONDS,
    secondOptions: CINEMA_SECOND_OPTIONS,
    usedFor:
      "The expensive 1080p quality engine. Best when you want the stronger film look without paying 4K Premiere prices.",
    youGet: [...EDITOR_GET, "One prepaid Standard-class 1080p film-engine render", "Cinematic frames and motion pass"],
    difference:
      "Cinema is the high-quality 1080p option we kept. It costs more than Lite and Mid because the quality engine bill is higher (about 40¢/sec before waste). Premiere is the only step above it.",
    costExplained:
      "99¢ per second, $7.99 minimum. Quality 1080p list rates run about 40¢ per second before retries. We price at 99¢ so UR never loses money on that render. Tax and Stripe on top, paid by you.",
  },
  {
    id: "premiere",
    label: "Premiere 4K",
    badge: "Highest resolution",
    engineClass: "standard_4k",
    resolutionLabel: "4K quality engine",
    rateCentsPerSecond: PREMIERE_RATE_CENTS_PER_SECOND,
    minCents: PREMIERE_MIN_CENTS,
    maxSeconds: PREMIERE_MAX_SECONDS,
    secondOptions: PREMIERE_SECOND_OPTIONS,
    usedFor:
      "The highest-resolution AI film we sell. 4K quality-engine seconds. Not a Hollywood movie, a ToonBee twin, or an unlimited studio. Best when you want the sharpest AI clip we can buy.",
    youGet: [
      ...EDITOR_GET,
      "One prepaid Standard-class 4K film-engine render",
      "Highest resolution on this menu — 4K engine seconds",
    ],
    difference:
      "Premiere is the top rung. It is more expensive than Cinema because 4K quality-engine list rates run about 60¢ per second. We do not call this Hollywood. It is the highest resolution the API we buy will sell.",
    costExplained:
      "$1.49 per second, $11.99 minimum. 4K quality-engine list is about 60¢ per second. We price at $1.49 so retries and a margin stay covered and Kenneth does not lose money. Tax and Stripe on top, paid by you.",
  },
] as const;

export function isCartoonStudioTierId(value: string): value is CartoonStudioTierId {
  return value === "draft" || value === "lite" || value === "mid" || value === "cinema" || value === "premiere";
}

export function isFilmEngineTier(tierId: CartoonStudioTierId): boolean {
  return tierId !== "draft";
}

export function getCartoonStudioTier(tierId: CartoonStudioTierId): CartoonStudioTier {
  const tier = CARTOON_STUDIO_TIERS.find((item) => item.id === tierId);
  if (!tier) {
    throw new Error("Unknown Cartoon Studio plan.");
  }
  return tier;
}

export function costFloorCents(tierId: CartoonStudioTierId, billedSeconds: number): number {
  if (tierId === "draft") return DRAFT_COST_FLOOR_CENTS;
  return COST_PER_SECOND[tierId] * billedSeconds;
}

function protectSubtotal(cents: number): number {
  if (cents === IN_APP_ONLY_SUBTOTAL_CENTS) return IN_APP_ONLY_SUBTOTAL_CENTS + 99;
  return cents;
}

export type CartoonStudioQuote = {
  tierId: CartoonStudioTierId;
  label: string;
  billedSeconds: number;
  rateCentsPerSecond: number;
  rateDisplay: string;
  minDisplay: string;
  subtotalCents: number;
  subtotalDisplay: string;
  costFloorCents: number;
  platformNetCents: number;
  sku: string;
};

export function quoteCartoonStudio(
  tierId: CartoonStudioTierId,
  requestedSeconds: number,
): CartoonStudioQuote {
  const tier = getCartoonStudioTier(tierId);
  const billedSeconds = Math.min(
    tier.maxSeconds,
    Math.max(tier.secondOptions[0] ?? 8, Math.round(requestedSeconds)),
  );
  const raw = Math.max(tier.minCents, tier.rateCentsPerSecond * billedSeconds);
  const subtotalCents = protectSubtotal(raw);
  const floor = costFloorCents(tierId, billedSeconds);
  if (subtotalCents < floor + MIN_GROSS_MARGIN_CENTS) {
    throw new Error("Cartoon Studio quote fell below the profit floor.");
  }
  if (subtotalCents === IN_APP_ONLY_SUBTOTAL_CENTS) {
    throw new Error("Cartoon Studio cannot use the $5.00 in-app price.");
  }
  return {
    tierId,
    label: tier.label,
    billedSeconds,
    rateCentsPerSecond: tier.rateCentsPerSecond,
    rateDisplay: `${formatUsd(tier.rateCentsPerSecond)}/sec`,
    minDisplay: formatUsd(tier.minCents),
    subtotalCents,
    subtotalDisplay: formatUsd(subtotalCents),
    costFloorCents: floor,
    platformNetCents: subtotalCents - floor,
    sku: `cartoon.${tierId}.${billedSeconds}s`,
  };
}

export function listCartoonStudioQuotes(): CartoonStudioQuote[] {
  return CARTOON_STUDIO_TIERS.flatMap((tier) =>
    tier.secondOptions.map((seconds) => quoteCartoonStudio(tier.id, seconds)),
  );
}

export const CARTOON_STUDIO_BILLING_NOTES = [
  CARTOON_STUDIO_PAY_FIRST_RULE,
  CARTOON_STUDIO_NO_REFUND_POLICY,
  AI_PURCHASE_NO_REFUND_POLICY,
  "Five prepaid plans: Draft (cheapest stills) · Lite Motion (cheap 720p engine) · Mid Motion (1080p fast) · Cinema (expensive 1080p quality) · Premiere 4K (highest resolution). That is the whole ladder.",
  "Lite and Mid are cheaper because they use a different, lower-cost engine API — not because UR eats the bill.",
  "Premiere 4K is the highest resolution we can buy from the quality engine. It is not a Hollywood movie.",
  "You pay the service subtotal, then your state's sales tax, then Stripe's 2.9% + $0.30. UR does not eat tax or card fees.",
  "Checkout is on the website (not a $5.00 in-app purchase). After you pay, the same cartoon and editor open in the app.",
  "If you want more seconds than you paid for, buy another prepaid job. Unused seconds are not refunded.",
] as const;
