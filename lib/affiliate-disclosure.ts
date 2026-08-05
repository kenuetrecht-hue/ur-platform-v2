/**
 * Wrap affiliate / advertising links with mandatory before-and-after AI + commission disclosures.
 * Shared by server AI guardrails, ElevenLabs TTS, and client Web Speech / Azure TTS.
 */

import {
  AFFILIATE_LINK_AFTER_TEXT,
  AFFILIATE_LINK_AFTER_VOICE,
  AFFILIATE_LINK_BEFORE_TEXT,
  AFFILIATE_LINK_BEFORE_VOICE,
} from "./platform-disclosure-copy";

export type DisclosureChannel = "text" | "voice";

const URL_IN_TEXT = /https?:\/\/[^\s<>)\]"']+/gi;
const MARKDOWN_LINK = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi;

const AFFILIATE_URL_HINT =
  /amazon|amzn\.|walmart|target\.com|affiliate|ref=|tag=|utm_|urplatform\.app\/link|a\.co\/|bit\.ly|geni\.us|r\.style/i;

const ADVERTISING_CONTEXT =
  /\b(affiliate|sponsored|advertisement|advertising|promo(?:tion)?|commission|buy now|shop now|special offer|limited time)\b/i;

function disclosures(channel: DisclosureChannel) {
  return channel === "voice"
    ? { before: AFFILIATE_LINK_BEFORE_VOICE, after: AFFILIATE_LINK_AFTER_VOICE }
    : { before: AFFILIATE_LINK_BEFORE_TEXT, after: AFFILIATE_LINK_AFTER_TEXT };
}

export function isAffiliateOrAdUrl(url: string): boolean {
  return AFFILIATE_URL_HINT.test(url);
}

export function messageContainsAffiliateLink(text: string): boolean {
  if (MARKDOWN_LINK.test(text)) {
    MARKDOWN_LINK.lastIndex = 0;
    return true;
  }
  MARKDOWN_LINK.lastIndex = 0;
  const urls = text.match(URL_IN_TEXT) ?? [];
  return urls.some((u) => isAffiliateOrAdUrl(u) || ADVERTISING_CONTEXT.test(text));
}

function shouldWrapSegment(url: string, fullText: string): boolean {
  return isAffiliateOrAdUrl(url) || ADVERTISING_CONTEXT.test(fullText);
}

/** Insert before/after disclosures around affiliate links and ad blocks. */
export function applyAffiliateDisclosures(
  text: string,
  channel: DisclosureChannel = "text",
): { text: string; hadAffiliateLinks: boolean } {
  if (!text.trim()) {
    return { text, hadAffiliateLinks: false };
  }

  const { before, after } = disclosures(channel);
  let result = text;
  let hadAffiliateLinks = false;

  result = result.replace(MARKDOWN_LINK, (full, label: string, url: string) => {
    if (!shouldWrapSegment(url, text)) return full;
    hadAffiliateLinks = true;
    const sep = channel === "voice" ? " " : "\n\n";
    return `${before}${sep}[${label}](${url})${sep}${after}`;
  });

  const plainUrls = [...result.matchAll(/https?:\/\/[^\s<>)\]"']+/gi)];
  for (let i = plainUrls.length - 1; i >= 0; i--) {
    const match = plainUrls[i]!;
    const url = match[0];
    const start = match.index ?? 0;
    if (!shouldWrapSegment(url, text)) continue;
    if (start > 0 && result.slice(Math.max(0, start - 2), start) === "](") continue;
    const preceding = result.slice(Math.max(0, start - 40), start);
    if (preceding.includes("before link") || preceding.includes("Affiliate & AI disclosure")) continue;
    hadAffiliateLinks = true;
    const sep = channel === "voice" ? " " : "\n\n";
    result = result.slice(0, start) + `${before}${sep}${url}${sep}${after}` + result.slice(start + url.length);
  }

  if (!hadAffiliateLinks && ADVERTISING_CONTEXT.test(text) && /\$\d|subscribe|purchase|order/i.test(text)) {
    hadAffiliateLinks = true;
    const sep = channel === "voice" ? " " : "\n\n";
    result = `${before}${sep}${result}${sep}${after}`;
  }

  return { text: result, hadAffiliateLinks };
}

export const AI_AFFILIATE_SYSTEM_RULE = `
## Affiliate & advertising links (mandatory — text AND voice)
- Before sharing ANY affiliate link, product link, or paid offer URL, you MUST verbally/textually state:
  "Affiliate disclosure: this is an AI-generated message and UR Platform may earn a commission."
- Place the link ONLY after that pre-disclosure.
- Immediately AFTER the link, repeat: "End of affiliate link — AI-generated; UR Platform may receive a commission."
- This applies whether the user is reading text or hearing your voice.
- Never share affiliate links without both the before AND after disclosure wrapping the link.
`.trim();
