/** Voice-to-prompt: any spoken language, printed as text (English when needed). */

/** Keep decoded audio under Express 1MB JSON (base64 expands ~4/3). */
export const SPEECH_PROMPT_MAX_BYTES = 700_000;
export const SPEECH_PROMPT_MAX_SECONDS = 30;

export const SPEECH_PROMPT_MIME_TYPES = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
] as const;

export type SpeechPromptMimeType = (typeof SPEECH_PROMPT_MIME_TYPES)[number];

export function isSpeechPromptMimeType(value: string): boolean {
  const mime = value.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  return SPEECH_PROMPT_MIME_TYPES.some((allowed) => allowed.split(";")[0] === mime);
}

export function normalizeSpeechMime(value: string): string {
  const mime = value.trim().toLowerCase().split(";")[0]?.trim() ?? "audio/webm";
  if (mime === "audio/x-wav") return "audio/wav";
  return mime;
}

export type SpeechPromptResult = {
  transcript: string;
  language: string;
  english: string;
  translated: boolean;
  printedText: string;
};

export function pickPrintedSpeechText(params: {
  transcript: string;
  english: string;
  translated: boolean;
}): string {
  const english = params.english.trim();
  const original = params.transcript.trim();
  if (params.translated && english) return english;
  return original || english;
}
