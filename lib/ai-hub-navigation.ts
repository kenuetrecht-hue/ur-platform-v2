/** Consolidated category groups for the AI Hub — fewer taps, every specialist still reachable. */
export type AiHubCategoryGroup = {
  id: string;
  label: string;
  emoji: string;
  /** Empty = show all categories */
  categories: string[];
};

export const AI_HUB_CATEGORY_GROUPS: AiHubCategoryGroup[] = [
  { id: "all", label: "All", emoji: "✨", categories: [] },
  { id: "platform", label: "Platform", emoji: "🏠", categories: ["Platform"] },
  { id: "construction", label: "Trades", emoji: "🔨", categories: ["Construction", "Outdoor"] },
  { id: "engineering", label: "Engineering", emoji: "🏛️", categories: ["Engineering"] },
  {
    id: "automotive",
    label: "Automotive & Marine",
    emoji: "🚗",
    categories: ["Automotive", "Small Engines", "Marine"],
  },
  {
    id: "business",
    label: "Business",
    emoji: "📊",
    categories: [
      "Business",
      "Finance",
      "Marketing",
      "Sales",
      "Human Resources",
      "Operations",
      "Product",
      "Real Estate",
    ],
  },
  {
    id: "creative",
    label: "Creative",
    emoji: "🎨",
    categories: ["Creative", "Writing", "3D & Design"],
  },
  { id: "career", label: "Career & News", emoji: "📰", categories: ["Career", "News"] },
  {
    id: "health",
    label: "Health",
    emoji: "🧘",
    categories: ["Health & Wellness", "Health & Fitness"],
  },
  { id: "tech", label: "Tech", emoji: "💻", categories: ["Technology", "Game Development", "Support"] },
  { id: "legal", label: "Legal", emoji: "⚖️", categories: ["Legal Reference"] },
  { id: "language", label: "Language", emoji: "🌍", categories: ["Language"] },
];

export function filterCreatorsByGroup<
  T extends { id: string; name: string; category: string; avatar: string; mission?: string },
>(creators: T[], groupId: string, searchQuery = ""): T[] {
  const group = AI_HUB_CATEGORY_GROUPS.find((g) => g.id === groupId);
  const query = searchQuery.trim().toLowerCase();

  let filtered = creators;
  if (group && group.categories.length > 0) {
    filtered = creators.filter((c) => group.categories.includes(c.category));
  }

  if (!query) return filtered;

  return filtered.filter((c) => {
    const haystack = `${c.name} ${c.category} ${c.id} ${c.mission ?? ""}`.toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    return words.every((word) => haystack.includes(word));
  });
}
