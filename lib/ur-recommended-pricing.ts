/**
 * Owner-approved retail pricing (Aug 2026).
 * Base rates + owner bump: day +$1 · week +$3 · month +$5.
 */

export type BillingPeriod = "day" | "week" | "month";

export type PeriodPrices = {
  day: { usd: number; cap: string };
  week: { usd: number; cap: string };
  month: { usd: number; cap: string };
  other?: string;
};

export type RecommendedProductPricing = {
  id: string;
  category: string;
  feature: string;
  prices: PeriodPrices;
  notes: string;
};

export const UR_RECOMMENDED_PRICING: RecommendedProductPricing[] = [
  {
    id: "text-standard",
    category: "Text chat",
    feature: "Platform text pass (all specialists, one at a time)",
    prices: {
      day: { usd: 7.99, cap: "35 messages / 24h" },
      week: { usd: 15.99, cap: "130 messages / 7d" },
      month: { usd: 24.99, cap: "350 messages (~12/day)" },
      other: "Hive consult = 3 msgs · Learn mode = 5 msgs · Photo upload = 2 msgs",
    },
    notes: "Platform text pass — every specialist, one at a time. Voice talk is sold separately.",
  },
  {
    id: "text-professional",
    category: "Text chat",
    feature: "Professional compute (TechBuilder, GameForge, CAD) — included in the pass",
    prices: {
      day: { usd: 7.99, cap: "Included · 35 messages shared" },
      week: { usd: 15.99, cap: "Included · 130 messages shared" },
      month: { usd: 24.99, cap: "Included · 350 messages shared" },
      other: "Sandbox runs billed separately (see Code & sandbox)",
    },
    notes: "Higher token cost ~$0.015/msg; message cap keeps the pass profitable.",
  },
  {
    id: "text-premium",
    category: "Text chat",
    feature: "Premium compute (LinguaMate, AI Translator) — included in the pass",
    prices: {
      day: { usd: 7.99, cap: "Included · 35 messages shared" },
      week: { usd: 15.99, cap: "Included · 130 messages shared" },
      month: { usd: 24.99, cap: "Included · 350 messages shared" },
    },
    notes: "Same checkout as every other specialist.",
  },
  {
    id: "text-bundle-all",
    category: "Text chat",
    feature: "Extra concurrent AI slot (Hive / Town Hall / two chats at once)",
    prices: {
      day: { usd: 4.99, cap: "+1 concurrent AI / 24h" },
      week: { usd: 9.99, cap: "+1 concurrent AI / 7d" },
      month: { usd: 14.99, cap: "+1 concurrent AI / 30d" },
      other: "Requires an active text pass. Switching AIs one-at-a-time is free.",
    },
    notes: "Pay extra only when talking to more than one AI at the same time.",
  },
  {
    id: "voice-talk",
    category: "Voice & video",
    feature: "Specialist talk-back (hear AI speak / video talk)",
    prices: {
      day: { usd: 4.99, cap: "8 talk minutes / 24h" },
      week: { usd: 12.99, cap: "25 talk minutes / 7d" },
      month: { usd: 29.99, cap: "70 talk minutes / 30d" },
      other: "Add-on packs: $4.99 = 12 min · $14.99 = 40 min · Hard stop 60 min/day",
    },
    notes: "API ~$0.10/min.",
  },
  {
    id: "voice-creator-affiliate",
    category: "Voice & video",
    feature: "Creator voice pack · Affiliate Associate voice",
    prices: {
      day: { usd: 3.49, cap: "5 voice minutes / 24h" },
      week: { usd: 8.99, cap: "15 voice minutes / 7d" },
      month: { usd: 17.99, cap: "35 voice minutes / 30d" },
      other: "Single pack: $3.99 / 25 min (top-up anytime)",
    },
    notes: "Associate AI text stays free.",
  },
  {
    id: "images-imagen",
    category: "Images",
    feature: "Logo / creative image generation (Imagen)",
    prices: {
      day: { usd: 3.99, cap: "5 images / 24h" },
      week: { usd: 10.99, cap: "20 images / 7d" },
      month: { usd: 24.99, cap: "60 images (~2/day)" },
      other: "Single: $0.99/image · Bulk: 15 for $9.99 · Hard cap 25 images/day",
    },
    notes: "Never unlimited in text sub.",
  },
  {
    id: "images-vision",
    category: "Images",
    feature: "Photo / PDF analysis in chat (vision)",
    prices: {
      day: { usd: 2.99, cap: "5 uploads / 24h" },
      week: { usd: 7.99, cap: "18 uploads / 7d" },
      month: { usd: 14.99, cap: "50 uploads / 30d" },
      other: "Or included: each upload = 2 message units on text plan",
    },
    notes: "Standalone or bundled via message units.",
  },
  {
    id: "code-techbuilder",
    category: "Code & sandbox",
    feature: "TechBuilder sandbox (Builder tier)",
    prices: {
      day: { usd: 5.99, cap: "10 runs · 1 hr CPU / 24h" },
      week: { usd: 15.99, cap: "35 runs · 5 hr CPU / 7d" },
      month: { usd: 29.99, cap: "150 runs · 2 hr CPU/day" },
      other: "Deploy/export: $2.99 each · 10-pack $19.99",
    },
    notes: "Maps to TechBuilder Builder upgrade.",
  },
  {
    id: "code-techbuilder-studio",
    category: "Code & sandbox",
    feature: "TechBuilder Studio (power tier)",
    prices: {
      day: { usd: 10.99, cap: "25 runs · 3 hr CPU / 24h" },
      week: { usd: 27.99, cap: "80 runs · 12 hr CPU / 7d" },
      month: { usd: 64.99, cap: "400 runs · 6 hr CPU/day" },
      other: "Requires Builder or standalone Studio sub",
    },
    notes: "Maps to TechBuilder Studio upgrade.",
  },
  {
    id: "code-gameforge",
    category: "Code & sandbox",
    feature: "GameForge sandbox add-on",
    prices: {
      day: { usd: 4.99, cap: "3 publish attempts / 24h" },
      week: { usd: 12.99, cap: "10 publish attempts / 7d" },
      month: { usd: 24.99, cap: "30 publish attempts / 30d" },
      other: "Best bundled with Game Dev AI professional text sub",
    },
    notes: "GameForge add-on.",
  },
  {
    id: "longform-author",
    category: "Long-form content",
    feature: "Book / song / script / poem chapters (Learn mode)",
    prices: {
      day: { usd: 5.99, cap: "2 chapters / 24h" },
      week: { usd: 12.99, cap: "8 chapters / 7d" },
      month: { usd: 24.99, cap: "25 chapters (~1/day)" },
      other: "Single chapter: $2.99 · 5-pack: $12.99 · Hard cap 3 chapters/day",
    },
    notes: "Each chapter ≈ 5 message units.",
  },
  {
    id: "search-web",
    category: "Web search",
    feature: "Web search + citations add-on",
    prices: {
      day: { usd: 2.99, cap: "15 searches / 24h" },
      week: { usd: 7.99, cap: "50 searches / 7d" },
      month: { usd: 14.99, cap: "150 searches (~5/day)" },
      other: "10 searches/day included on any text sub · +50 pack $4.99",
    },
    notes: "Google grounding ~$0.035/query.",
  },
  {
    id: "hive-consult",
    category: "Hive & multi-AI",
    feature: "Hive Town Hall multi-specialist consult",
    prices: {
      day: { usd: 3.99, cap: "3 hive sessions / 24h" },
      week: { usd: 10.99, cap: "12 hive sessions / 7d" },
      month: { usd: 19.99, cap: "40 hive sessions / 30d" },
      other: "Or use text plan: 1 hive = 3 message units",
    },
    notes: "Unique UR feature.",
  },
  {
    id: "workspace-3d",
    category: "3D workspace",
    feature: "3D Babylon workspace (concurrent AI slots)",
    prices: {
      day: { usd: 10.99, cap: "2 concurrent AIs · 8 hr session" },
      week: { usd: 22.99, cap: "2 concurrent AIs · 7d access" },
      month: { usd: 49.99, cap: "3 concurrent AIs · 20 exports/mo" },
      other: "Solo $29.99/mo (1 AI) · Studio $74.99/mo (5 AIs) · Extra slot +$9.99/mo",
    },
    notes: "Workspace access ≠ text chat license.",
  },
  {
    id: "social-post-assistant",
    category: "Social",
    feature: "Social post writing assistant",
    prices: {
      day: { usd: 2.49, cap: "5 assists / 24h" },
      week: { usd: 6.99, cap: "20 assists / 7d" },
      month: { usd: 11.99, cap: "80 assists (~3/day)" },
      other: "Annual: $49.99 / 900 assists (optional)",
    },
    notes: "High margin assists.",
  },
  {
    id: "real-estate",
    category: "Real estate",
    feature: "Property search + voice property tours",
    prices: {
      day: { usd: 10.99, cap: "15 property queries / 24h" },
      week: { usd: 22.99, cap: "50 queries / 7d" },
      month: { usd: 34.99, cap: "40 queries/day max" },
      other: "Voice tour minutes use talk-time balance",
    },
    notes: "Zillow/MLS API costs in caps.",
  },
  {
    id: "live-class-platform",
    category: "Live classes",
    feature: "Creator live AI classes (creator-set pricing)",
    prices: {
      day: { usd: 0, cap: "N/A — event-based" },
      week: { usd: 0, cap: "N/A — event-based" },
      month: { usd: 0, cap: "N/A — event-based" },
      other: "Floor $0.35/min ticket · Group floor $0.01/min (25+ seats) · UR keeps 15%",
    },
    notes: "Creator sets ticket rate.",
  },
  {
    id: "commerce-creator",
    category: "Commerce",
    feature: "Creator store · merch · digital goods",
    prices: {
      day: { usd: 0, cap: "N/A" },
      week: { usd: 0, cap: "N/A" },
      month: { usd: 0, cap: "N/A" },
      other: "Platform fee 15% (launch tier 1: 7.5% for 6 mo) · Creator keeps 85%",
    },
    notes: "Stripe pass-through to buyer.",
  },
  {
    id: "affiliate-bonus",
    category: "Affiliate",
    feature: "Affiliate referral bonus",
    prices: {
      day: { usd: 0, cap: "N/A" },
      week: { usd: 0, cap: "N/A" },
      month: { usd: 0, cap: "N/A" },
      other: "$5 after the referred creator's free 24 hours, then 5 later sales",
    },
    notes: "Launch joiners get 24 hours free. Sales in that window do not count. Then five transactions. First 30 days only for the free day.",
  },
  {
    id: "loyalty-text",
    category: "Loyalty",
    feature: "Loyalty point redemptions (priced above cash)",
    prices: {
      day: { usd: 0, cap: "500 LP per text · 250 LP per talk minute" },
      week: { usd: 0, cap: "Daily sign-in 100 LP + 10/streak day · Welcome 500 LP" },
      month: { usd: 0, cap: "500 LP = 2 talk min · cash $1 still buys 5 min" },
      other: "No USD — points cost more than paying so UR stays profitable",
    },
    notes: "LP are free to earn; redemptions stay worse than cash.",
  },
];

export function formatUsd(amount: number): string {
  if (amount <= 0) return "—";
  return `$${amount.toFixed(2)}`;
}

export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

export function getRecommendedPricingByCategory(): Map<string, RecommendedProductPricing[]> {
  const map = new Map<string, RecommendedProductPricing[]>();
  for (const row of UR_RECOMMENDED_PRICING) {
    const list = map.get(row.category) ?? [];
    list.push(row);
    map.set(row.category, list);
  }
  return map;
}
