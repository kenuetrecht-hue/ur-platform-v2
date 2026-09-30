/** What a new member says they want to see. Fixed list so the feed can match it. */

export const MEMBER_INTERESTS = [
  { id: "trades", label: "Trades and the jobsite", keywords: ["electric", "plumb", "hvac", "contractor", "cnc", "roof", "construct", "frame"] },
  { id: "music", label: "Music", keywords: ["music", "song", "guitar", "lyric"] },
  { id: "stories", label: "Stories and poems", keywords: ["poem", "author", "story", "write", "skit"] },
  { id: "news", label: "News explainers", keywords: ["news", "briefing", "headline"] },
  { id: "languages", label: "Languages", keywords: ["language", "spanish", "hello", "vowel"] },
  { id: "business", label: "Business and careers", keywords: ["business", "career", "sales", "market", "receipt"] },
  { id: "wellness", label: "Fitness and wellness", keywords: ["fitness", "wellness", "health"] },
  { id: "making", label: "3D, games, and cartoons", keywords: ["3d", "game", "cartoon", "skit", "design"] },
] as const;

export type MemberInterestId = (typeof MEMBER_INTERESTS)[number]["id"];

export const MEMBER_INTEREST_IDS = MEMBER_INTERESTS.map((item) => item.id) as [
  MemberInterestId,
  ...MemberInterestId[],
];

const KEYWORDS = new Map(MEMBER_INTERESTS.map((item) => [item.id, item.keywords]));

export function isMemberInterestId(value: string): value is MemberInterestId {
  return MEMBER_INTEREST_IDS.includes(value as MemberInterestId);
}

/** How strongly a post matches the interests the member picked. */
export function interestMatchScore(text: string, interests: readonly string[]): number {
  const hay = text.toLowerCase();
  let score = 0;
  for (const id of interests) {
    const words = KEYWORDS.get(id as MemberInterestId);
    if (!words) continue;
    if (words.some((word) => hay.includes(word))) score += 50;
  }
  return score;
}
