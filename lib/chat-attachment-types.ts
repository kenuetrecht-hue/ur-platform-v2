/** Shared chat attachment types (client + server). */

export const CHAT_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
export const CHAT_ATTACHMENT_MAX_COUNT = 2;

export const CHAT_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export type ChatAttachmentMimeType = (typeof CHAT_ATTACHMENT_MIME_TYPES)[number];

export type ChatAttachmentInput = {
  mimeType: string;
  /** Raw base64 or data-URL — server strips prefix. */
  base64: string;
  fileName?: string;
};

export type ChatSearchCitation = {
  title: string;
  description: string;
  url: string;
  source: string;
};

export type ChatMessageAttachmentPreview = {
  mimeType: string;
  /** Local blob/data URI for UI preview. */
  previewUri: string;
  fileName?: string;
};
