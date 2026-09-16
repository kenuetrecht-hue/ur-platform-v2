/** Newest exchange at the top: your line, then the reply, then older chat below. */

export function newestConversationFirst<T>(
  messages: T[],
  getRole: (item: T) => string = (item) => String((item as { role?: string }).role ?? ""),
): T[] {
  const out: T[] = [];
  let index = messages.length - 1;
  while (index >= 0) {
    const current = messages[index];
    const previous = index > 0 ? messages[index - 1] : undefined;
    if (
      current &&
      previous &&
      getRole(current) === "ai" &&
      getRole(previous) === "user"
    ) {
      out.push(previous);
      out.push(current);
      index -= 2;
      continue;
    }
    if (current) out.push(current);
    index -= 1;
  }
  return out;
}
