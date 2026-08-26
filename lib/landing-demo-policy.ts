/** Public homepage demo limits — shared by client hints and server enforcement. */

export const LANDING_DEMO_MESSAGE_MAX = 150;
export const LANDING_DEMO_REPLY_MAX = 50;
export const LANDING_DEMO_VOICE_TEXT_MAX = 50;

/** Public specialists allowed on the homepage test drive. */
export const LANDING_DEMO_CREATOR_IDS = [
  "ai-coder-001",
  "ai-marina-mechanic-001",
  "contentmate",
  "linguamate",
  "ai-wellness-001",
  "ai-3d-specialist",
] as const;

export type LandingDemoCreatorId = (typeof LANDING_DEMO_CREATOR_IDS)[number];

/** Minimum time (ms) between page load and send — blocks instant bot posts. */
export const LANDING_DEMO_MIN_PAGE_MS = 2_500;

/** Demo session token lifetime (ms). */
export const LANDING_DEMO_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Max failed / blocked send attempts per IP per hour before temporary block. */
export const LANDING_DEMO_MAX_SEND_ATTEMPTS_PER_HOUR = 3;

export function truncateLandingDemoReply(text: string, max = LANDING_DEMO_REPLY_MAX): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > max * 0.6) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }
  return `${slice.trim()}…`;
}

export function buildLandingDemoPromptAppend(creatorName: string): string {
  return [
    `LANDING PAGE PREVIEW (${creatorName}):`,
    `- Reply in ONE sentence, at most ${LANDING_DEMO_REPLY_MAX} characters total.`,
    "- Short, expert, wow-factor — make them want to sign up.",
    "- No markdown, lists, disclaimers, or \"As an AI\".",
    "- Tease what they unlock inside UR Platform.",
  ].join("\n");
}

const BOT_UA_PATTERNS = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /httpclient/i,
  /go-http-client/i,
  /java\//i,
  /libwww/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /bot\b/i,
  /spider/i,
  /crawler/i,
];

export function isSuspiciousDemoUserAgent(userAgent: string | undefined): boolean {
  const ua = (userAgent ?? "").trim();
  if (ua.length < 8) return true;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(ua));
}

/** Same scanner/bot UA check used on login, signup, and KYC. */
export const isSuspiciousBotUserAgent = isSuspiciousDemoUserAgent;

export function isSuspiciousDemoMessage(message: string): boolean {
  const text = message.trim();
  if (text.length < 4) return true;
  if (/(.)\1{12,}/.test(text)) return true;
  if ((text.match(/https?:\/\//gi) ?? []).length > 1) return true;
  if (/<script|javascript:|onerror=/i.test(text)) return true;
  return false;
}
