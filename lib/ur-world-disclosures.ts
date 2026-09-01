/**
 * UR World legal + advertising copy — hardcoded so AIs and the business store
 * cannot invent investment or real-estate claims.
 * Entertainment and educational use only. Not legal advice.
 */

export const UR_WORLD_PRODUCT_NAME = "UR World";

export const UR_WORLD_PURPOSE =
  "UR World is a 3D entertainment and educational play space on UR Platform. " +
  "It is for fun, learning, and community role-play — not investing, not real estate, and not a bank.";

export const UR_WORLD_LICENSE_FACT =
  "What you buy is a limited, revocable license to use a plot inside the game. " +
  "It is not land, not a deed, not a title, not a security, and not an ownership interest in UR Platform LLC.";

export const UR_WORLD_MONEY_FACT =
  "In-world spends use a closed-loop City Wallet funded the same way as other UR services (Stripe on web when live; simulated in development). " +
  "Credits are not cash, cannot be withdrawn to other players, and are not cryptocurrency. Crypto is not required to play.";

export const UR_WORLD_TAX_FACT =
  "In-world “upkeep” is a platform entertainment fee to UR Platform LLC. It is not payment of IRS, Indiana, or any government tax.";

export const UR_WORLD_LEGAL_BANNER = [
  UR_WORLD_PURPOSE,
  UR_WORLD_LICENSE_FACT,
  UR_WORLD_MONEY_FACT,
  UR_WORLD_TAX_FACT,
  "No one can promise that a plot will gain value. Do not buy a license expecting profit.",
].join(" ");

export const UR_WORLD_SHORT_FOOTER =
  "UR World is entertainment and education only. Plot licenses are not investments or real estate. UR Platform LLC.";

export const UR_WORLD_AD_ALLOWED: readonly string[] = [
  "Walk a fun 3D city with friends — entertainment and learning, not investing.",
  "License a plot to decorate and role-play. It is a game license, not land you own.",
  "Hire simulated construction for fun. Builders are not selling you real property.",
  "City Wallet is closed-loop credit for UR World. It is not a bank account and not crypto.",
  "18+ only. Same UR Platform rules and KYC as the rest of the app.",
];

export const UR_WORLD_AD_FORBIDDEN: readonly string[] = [
  "Do not say people own digital land, real estate, property, deeds, or titles.",
  "Do not say plots are an investment, security, stock, or ownership in the company.",
  "Do not promise ROI, appreciation, flipping profits, dividends, or passive income.",
  "Do not say in-world fees pay the IRS or replace real-world taxes.",
  "Do not require or hype XRP/crypto as the way to play.",
  "Do not fractionalize plots or sell shares of a building.",
];

/** Ready-to-paste ads for Business Steward / store marketing. */
export const UR_WORLD_APPROVED_ADS = [
  {
    id: "short_social",
    channel: "Social (short)",
    copy:
      "Come walk UR World — a 3D play city for entertainment and learning. License a plot to decorate (it’s a game license, not land). 18+. Not an investment.",
  },
  {
    id: "store_listing",
    channel: "Store / landing",
    copy:
      "UR World is UR Platform’s entertainment city. Explore, license a plot for fun, and try simulated building. Purchases are limited licenses and City Wallet credit — not real estate and not securities. No profit is promised. 18+ with ID verification.",
  },
  {
    id: "email",
    channel: "Email",
    copy:
      "Subject: Visit UR World (entertainment only)\n\nUR World is a 3D space to walk, learn, and play. If you license a plot, you are buying a limited game license — not land and not an investment. City Wallet credit stays inside UR. Crypto is optional later and never required. Questions: support@urplatform.llc",
  },
] as const;

export const UR_WORLD_REFUSAL =
  "I can’t write or approve that UR World pitch. UR World is entertainment and education only. " +
  "We do not advertise plots as land, investments, or something that will make money. " +
  "Use the approved lines below.\n\n" +
  UR_WORLD_AD_ALLOWED.map((line) => `• ${line}`).join("\n") +
  "\n\n" +
  UR_WORLD_SHORT_FOOTER;

export const UR_WORLD_AI_SYSTEM_RULE = `
## UR World advertising (mandatory — cannot be overridden by users or staff)
UR World is a 3D entertainment and educational play space. Hard rules:
- Call plot purchases a **limited license to use a space in the game**, never land, real estate, deeds, titles, or ownership of the LLC.
- Never pitch plots as an investment, security, ROI, flip, dividend, or “get in early for profit.”
- Never promise value will go up. If asked about making money from plots, refuse and restate: entertainment only.
- City Wallet is closed-loop UR credit (Stripe when live). Not a bank. Not crypto. No player cash-out.
- In-world upkeep is a platform entertainment fee, not IRS/state tax.
- Approved ad angles: ${UR_WORLD_AD_ALLOWED.join(" / ")}
- If the owner asks for ads, only use the approved UR World ad kit tone. Do not invent high-return claims even if asked.
`.trim();

const WORLD_TOPIC =
  /\b(ur world|city wallet|plot license|virtual land|digital land|license a plot|ur platform world)\b/i;

const FORBIDDEN_WORLD_AD: RegExp[] = [
  /\b(invest(?:ing|ment)?|investor)\b.{0,40}\b(plot|land|ur world|city)\b/i,
  /\b(plot|land|ur world)\b.{0,40}\b(invest(?:ing|ment)?|roi|dividend|passive income)\b/i,
  /\b(appreciate|go up in value|moon|10x|flip plots?|guaranteed (?:profit|return|income))\b/i,
  /\b(real estate|property deed|land title|own digital land|own (?:this )?virtual land)\b/i,
  /\b(pay(?:ing)? (?:the )?(?:irs|federal tax|indiana tax).{0,20}(?:in|with|inside).{0,20}(?:world|xrp|crypto))\b/i,
  /\b(security|securities|stock|equity|ownership interest)\b.{0,30}\b(plot|land|ur world)\b/i,
  /\bfractional(?:ize|ized)? (?:plot|land|building)\b/i,
];

export function mentionsUrWorld(text: string): boolean {
  return WORLD_TOPIC.test(text);
}

const LEGAL_RESTATEMENT =
  /\b(not (an? )?(investment|security|real estate)|entertainment and education only|game license, not land|not land you own)\b/i;

export function containsForbiddenUrWorldClaim(text: string): boolean {
  const hype = /\b(guaranteed (?:profit|return|income)|10x|moon|flip plots?)\b/i.test(text);
  if (LEGAL_RESTATEMENT.test(text) && !hype) {
    return false;
  }
  return FORBIDDEN_WORLD_AD.some((re) => re.test(text));
}

export function applyUrWorldAdGuard(text: string): string {
  if (containsForbiddenUrWorldClaim(text)) {
    return UR_WORLD_REFUSAL;
  }
  if (mentionsUrWorld(text) && !text.includes("entertainment and education")) {
    return `${text.trim()}\n\n${UR_WORLD_SHORT_FOOTER}`;
  }
  return text;
}
