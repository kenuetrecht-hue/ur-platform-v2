/** Friendly fallback when Gemini or hive returns a blank body. */

export function resolveAiReplyOrFallback(rawReply: string | null | undefined, creatorName: string): string {
  const trimmed = (rawReply ?? "").replace(/\s+/g, " ").trim();
  if (trimmed.length > 0) return trimmed;
  return `${creatorName} is here. I did not get a usable reply just now — ask again in one sentence and I will answer in my field.`;
}
