/**
 * Server-side input sanitization for user-provided text.
 * Apply before passing data to LLMs, storage, or database queries.
 */

const NULL_BYTE = /\0/g;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Strip dangerous characters and normalize whitespace boundaries. */
export function sanitizeUserText(input: string, maxLength: number): string {
  return input
    .replace(NULL_BYTE, "")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, maxLength);
}

/** Language labels from client — letters, spaces, hyphens, parentheses only. */
export function sanitizeLanguageLabel(input: string): string {
  const cleaned = input
    .replace(NULL_BYTE, "")
    .replace(/[^\p{L}\p{M}\s\-'().,]/gu, "")
    .trim()
    .slice(0, 64);
  return cleaned;
}

/** Image / model prompts — remove null bytes and cap length. */
export function sanitizeModelPrompt(input: string, maxLength = 2000): string {
  return input.replace(NULL_BYTE, "").replace(CONTROL_CHARS, " ").trim().slice(0, maxLength);
}

/** Safe AI history turn after Zod validation. */
export function sanitizeChatHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  maxTurns: number,
  maxContentLength: number,
): Array<{ role: "user" | "assistant"; content: string }> {
  const sanitized = history.slice(-maxTurns).map((turn) => ({
    role: turn.role,
    content: sanitizeUserText(turn.content, maxContentLength),
  }));
  // Gemini chat history must start with a user turn (not the welcome assistant message).
  let start = 0;
  while (start < sanitized.length && sanitized[start]?.role === "assistant") {
    start += 1;
  }
  return sanitized.slice(start);
}

export const RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";

/** IDOR prevention — use NOT_FOUND response when ownership fails. */
export function assertOwnedResource(
  resourceUserId: string | number | null | undefined,
  requestUserId: string | number,
): void {
  if (resourceUserId == null || String(resourceUserId) !== String(requestUserId)) {
    throw new Error(RESOURCE_NOT_FOUND);
  }
}
