/**
 * UR inside search — indexes platform records only. Never calls web search.
 */

import { AI_CREATOR_CATALOG } from "../../lib/ai-creator-catalog";
import { isOwnerOpsAiId } from "../../lib/owner-platform-ops-catalog";
import {
  PLATFORM_SEARCH_EMPTY_HINT,
  PLATFORM_SEARCH_RULE,
  type PlatformSearchKind,
} from "../../lib/platform-search-policy";
import {
  rankDocuments,
  suggestDidYouMean,
  type RankedSearchHit,
  type SearchableDocument,
} from "../../lib/platform-search-engine";
import { listCreatorRoster } from "./partner-program-service";
import { listPublicPostsForSearch } from "./social-feed-service";
import { ensureAiFreeBoardSeeded, listAiFreeBoard } from "./ai-free-board-service";
import { syncFairShowCatalog } from "./fair-show-service";
import { listWatchCatalog } from "./watch-analytics-service";
import { listAllPublicProducts } from "./commerce-catalog-service";
import { sanitizeUserText } from "./input-sanitize";

function watchHref(kind: string, contentId: string, sessionId?: string): string {
  if (kind === "cartoon") return "/cartoon-studio";
  if (kind === "class_replay") return `/class-replay/${contentId}`;
  if (kind === "live_class") return `/live-session/${sessionId ?? contentId}`;
  if (kind === "social_video") return "/(tabs)/messages";
  return "/discover/fair-show";
}

function collectDocuments(params: { isPlatformOwner: boolean }): SearchableDocument[] {
  const docs: SearchableDocument[] = [];

  for (const ai of AI_CREATOR_CATALOG) {
    if (isOwnerOpsAiId(ai.id) && !params.isPlatformOwner) continue;
    docs.push({
      id: `specialist:${ai.id}`,
      kind: "specialist",
      title: ai.name,
      subtitle: ai.category,
      body: ai.mission,
      category: ai.category,
      href: `/ai/${ai.id}`,
      extra: ai.id,
    });
  }

  for (const creator of listCreatorRoster()) {
    docs.push({
      id: `creator:${creator.userId}`,
      kind: "creator",
      title: creator.displayName,
      subtitle: creator.customSlug ? `urplatform.llc/${creator.customSlug}` : "Human content creator",
      body: `${creator.followerCount} followers · ${creator.paidSubscriberCount} paid subscribers`,
      href: "/discover/fair-show",
      extra: creator.customSlug ?? "",
    });
  }

  ensureAiFreeBoardSeeded();
  for (const post of listAiFreeBoard({ limit: 60 }).posts) {
    docs.push({
      id: `ai-board:${post.id}`,
      kind: "ai_board",
      title: post.title,
      subtitle: `${post.creatorName} · ${post.lane === "watch" ? "Video + text" : "Text"}`,
      body: post.body,
      category: post.category,
      href: "/discover/ai-board",
      publishedAt: post.publishedAt,
      extra: post.creatorAiId,
    });
  }

  for (const post of listPublicPostsForSearch(80)) {
    docs.push({
      id: `post:${post.id}`,
      kind: "post",
      title: post.body.slice(0, 80) || `${post.authorName}'s ${post.kind}`,
      subtitle: `${post.authorName} · free ${post.kind}`,
      body: post.body,
      href: "/(tabs)/messages",
      publishedAt: post.createdAt,
      extra: post.hashtags.join(" "),
    });
  }

  syncFairShowCatalog();
  for (const video of listWatchCatalog()) {
    docs.push({
      id: `video:${video.contentId}`,
      kind: "video",
      title: video.title,
      subtitle: video.kind.replace("_", " "),
      body: video.category,
      category: video.category,
      href: watchHref(video.kind, video.contentId, video.sessionId),
      publishedAt: video.publishedAt,
    });
  }

  for (const product of listAllPublicProducts(80)) {
    docs.push({
      id: `shop:${product.id}`,
      kind: "shop",
      title: product.title,
      subtitle: `${product.storeName} · ${product.category}`,
      body: product.description,
      category: product.category,
      href: "/shop",
      extra: product.tags.join(" "),
    });
  }

  return docs;
}

const SEARCH_INDEX_TTL_MS = 20_000;
let memberIndexCache: { at: number; docs: SearchableDocument[] } | null = null;
let ownerIndexCache: { at: number; docs: SearchableDocument[] } | null = null;

function documentsForSearch(isPlatformOwner: boolean): SearchableDocument[] {
  const cache = isPlatformOwner ? ownerIndexCache : memberIndexCache;
  if (cache && Date.now() - cache.at < SEARCH_INDEX_TTL_MS) {
    return cache.docs;
  }
  const docs = collectDocuments({ isPlatformOwner });
  const next = { at: Date.now(), docs };
  if (isPlatformOwner) ownerIndexCache = next;
  else memberIndexCache = next;
  return docs;
}

export function _resetPlatformSearchCacheForTests(): void {
  memberIndexCache = null;
  ownerIndexCache = null;
}

export function searchPlatform(params: {
  query: string;
  kind?: PlatformSearchKind;
  isPlatformOwner?: boolean;
  limit?: number;
}): {
  query: string;
  rule: string;
  hits: RankedSearchHit[];
  counts: Record<PlatformSearchKind, number>;
  didYouMean: string | null;
  emptyHint: string;
} {
  const query = sanitizeUserText(params.query, 80);
  const docs = documentsForSearch(params.isPlatformOwner === true);
  const scoped = params.kind ? docs.filter((doc) => doc.kind === params.kind) : docs;
  const hits = rankDocuments(scoped, query, params.limit ?? 24);
  const counts = {
    specialist: 0,
    creator: 0,
    ai_board: 0,
    post: 0,
    video: 0,
    shop: 0,
  } satisfies Record<PlatformSearchKind, number>;
  for (const hit of rankDocuments(docs, query, 80)) {
    counts[hit.kind] += 1;
  }
  return {
    query,
    rule: PLATFORM_SEARCH_RULE,
    hits,
    counts,
    didYouMean: hits.length === 0 ? suggestDidYouMean(query, docs.map((d) => d.title)) : null,
    emptyHint: PLATFORM_SEARCH_EMPTY_HINT,
  };
}

export function suggestPlatformSearch(params: { isPlatformOwner?: boolean }): {
  rule: string;
  starters: string[];
} {
  const docs = documentsForSearch(params.isPlatformOwner === true);
  const starters = [
    "electrician",
    "Spanish",
    "guitar",
    "leak",
    "ContentMate",
    "cook",
  ];
  const live = docs
    .filter((doc) => doc.kind === "ai_board" || doc.kind === "creator")
    .slice(0, 4)
    .map((doc) => doc.title.split(" ").slice(0, 4).join(" "));
  return {
    rule: PLATFORM_SEARCH_RULE,
    starters: [...new Set([...starters, ...live])].slice(0, 8),
  };
}
