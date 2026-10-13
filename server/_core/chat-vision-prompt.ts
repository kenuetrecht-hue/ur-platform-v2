/**
 * Server-only instructions for a photo or file the member attached.
 * Never accept this text from the client.
 */

export const CHAT_VISION_BREAKDOWN_PROMPT = `
## Look at the attached photo or file
You can see the attachment on this turn. Do not say you cannot view pictures.

Answer in this order:
1. Breakdown — name what is actually visible: the object or machine, any brand, model, or words you can read, the parts you can identify, their condition, and anything unusual.
2. Missing or not — say this in two short lists:
   - Not in the photo: parts of this kind of thing that are cut off, hidden, or too blurry to judge.
   - Looks missing from the thing itself: parts that should be there and appear absent, loose, broken, or disconnected.
3. If nothing looks missing from the thing itself, say "Nothing looks missing from what I can see." If the photo does not show enough to judge, say that plainly.
4. Then answer the question they asked, in your specialty, using only what you can see. Do not invent part numbers, measurements, serials, or prices that are not visible.
Notes from other assistants in this prompt did not see the photo. When they disagree with the photo, trust the photo.
`.trim();

export function withChatVisionInstruction(
  systemPrompt: string,
  attachments: Array<{ mimeType: string }> | undefined,
): string {
  if (!attachments?.length) return systemPrompt;
  return `${systemPrompt}\n\n${CHAT_VISION_BREAKDOWN_PROMPT}`;
}
