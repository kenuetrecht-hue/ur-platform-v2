/** Pure JSON parse helpers — safe for vitest without AsyncStorage. */

export type AiChatOutboxItem = {
  id: string;
  creatorId: string;
  message: string;
  useHiveConsult?: boolean;
  targetLanguage?: string;
  channel: "creators" | "language";
  createdAt: string;
  attempts: number;
};

export function parseAiChatOutboxJson(raw: string | null): AiChatOutboxItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AiChatOutboxItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as AiChatOutboxItem).id === "string" &&
        typeof (item as AiChatOutboxItem).creatorId === "string" &&
        typeof (item as AiChatOutboxItem).message === "string",
    );
  } catch {
    return [];
  }
}
