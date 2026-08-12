import AsyncStorage from "@react-native-async-storage/async-storage";

export type AiChatOutboxItem = {
  id: string;
  creatorId: string;
  message: string;
  useHiveConsult?: boolean;
  /** LinguaMate chat mode extras */
  targetLanguage?: string;
  /** Which API route to use when flushing */
  channel: "creators" | "language";
  createdAt: string;
  attempts: number;
};

const STORAGE_KEY = "ur_ai_chat_outbox_v1";
const MAX_OUTBOX_ITEMS = 50;
const MAX_MESSAGE_LENGTH = 4000;

function safeParse(raw: string | null): AiChatOutboxItem[] {
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

async function writeAll(items: AiChatOutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_OUTBOX_ITEMS)));
}

export async function loadAiChatOutbox(): Promise<AiChatOutboxItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export async function loadAiChatOutboxForCreator(creatorId: string): Promise<AiChatOutboxItem[]> {
  const all = await loadAiChatOutbox();
  return all.filter((item) => item.creatorId === creatorId);
}

export async function enqueueAiChatOutbox(
  item: Omit<AiChatOutboxItem, "id" | "createdAt" | "attempts"> & { id?: string },
): Promise<AiChatOutboxItem> {
  const message = item.message.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) {
    throw new Error("Message is empty.");
  }

  const entry: AiChatOutboxItem = {
    id: item.id ?? `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    creatorId: item.creatorId,
    message,
    useHiveConsult: item.useHiveConsult,
    targetLanguage: item.targetLanguage,
    channel: item.channel,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  const all = await loadAiChatOutbox();
  all.push(entry);
  await writeAll(all);
  return entry;
}

export async function removeAiChatOutboxItem(id: string): Promise<void> {
  const all = await loadAiChatOutbox();
  await writeAll(all.filter((item) => item.id !== id));
}

export async function bumpAiChatOutboxAttempt(id: string): Promise<void> {
  const all = await loadAiChatOutbox();
  const next = all.map((item) =>
    item.id === id ? { ...item, attempts: item.attempts + 1 } : item,
  );
  await writeAll(next);
}

export async function clearAiChatOutboxForTests(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** @internal vitest — in-memory shim when AsyncStorage is mocked */
export function _parseAiChatOutboxJson(raw: string | null): AiChatOutboxItem[] {
  return safeParse(raw);
}
