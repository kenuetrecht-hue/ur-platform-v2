/** What to ask when the member sends a picture and leaves the box empty. */
export const CHAT_PHOTO_LOOK_MESSAGE =
  "Look at this picture. Give a breakdown of what is in it, and say whether anything is missing.";

export const CHAT_PHOTO_SIGN_IN_MESSAGE =
  "Sign in, then press Send again. Your picture is still in the chat box.";

export function isChatSignInError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return /please login|\b10001\b/i.test(raw);
}

/** Keep the spoken error plain. 10001 means the server did not see a sign-in. */
export function plainChatError(error: unknown, fallback: string): string {
  if (isChatSignInError(error)) return CHAT_PHOTO_SIGN_IN_MESSAGE;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
