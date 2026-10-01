export type MergeChatTurn = {
  id: string;
  role: "user" | "ai";
  text: string;
};

/**
 * Server sync is the saved transcript. A reply that was just spoken can sit in
 * local state for a moment before the save lands. Keep that unsaved tail so the
 * words stay on screen. Drop a local opening line once real turns exist.
 */
export function mergeUnsavedChatTail<T extends MergeChatTurn>(local: T[], synced: T[]): T[] {
  if (synced.length === 0) return local;

  const syncedKeys = new Set(synced.map((message) => `${message.role}\0${message.text}`));
  const pending: T[] = [];
  for (let index = local.length - 1; index >= 0; index -= 1) {
    const message = local[index];
    if (!message) break;
    if (syncedKeys.has(`${message.role}\0${message.text}`)) break;
    pending.unshift(message);
  }

  const openingOnly =
    pending.length === 1 &&
    pending[0]?.role === "ai" &&
    local[0]?.id === pending[0]?.id &&
    !local.some((message) => message.role === "user");

  return openingOnly ? synced : [...synced, ...pending];
}
