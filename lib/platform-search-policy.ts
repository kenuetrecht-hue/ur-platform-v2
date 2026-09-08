/**
 * UR inside search — finds people and content already on the platform.
 * This is not web search. Web search is a paid AI add-on.
 */

export const PLATFORM_SEARCH_TITLE = "Search UR";

export const PLATFORM_SEARCH_RULE =
  "This search looks only inside UR Platform — specialists, human creators, free AI posts, Fair Show videos, public feed posts, classes, and the shop. " +
  "It does not search the internet. Web search is what the AIs do in chat, and that is a paid add-on on your text pass.";

export const PLATFORM_SEARCH_RULE_SHORT =
  "Inside UR only. The internet is a paid AI add-on — not this box.";

export const PLATFORM_SEARCH_PLACEHOLDER = "Search UR — AIs, creators, videos, posts, shop";

export const PLATFORM_SEARCH_EMPTY_HINT =
  "Type a trade, a name, a language, or a topic. Try electrician, Spanish, guitar, or leak.";

export const PLATFORM_SEARCH_KINDS = [
  "specialist",
  "creator",
  "ai_board",
  "post",
  "video",
  "shop",
] as const;

export type PlatformSearchKind = (typeof PLATFORM_SEARCH_KINDS)[number];

export const PLATFORM_SEARCH_KIND_LABEL: Record<PlatformSearchKind, string> = {
  specialist: "UR AI",
  creator: "Creator",
  ai_board: "AI Free Board",
  post: "Free post",
  video: "Video / class",
  shop: "Shop",
};

export const PLATFORM_SEARCH_QUERY_MAX = 80;
export const PLATFORM_SEARCH_MIN_CHARS = 2;
