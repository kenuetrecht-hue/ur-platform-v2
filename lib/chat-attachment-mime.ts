import {
  CHAT_ATTACHMENT_MIME_TYPES,
  type ChatAttachmentMimeType,
} from "./chat-attachment-types";

const ALLOWED = new Set<string>(CHAT_ATTACHMENT_MIME_TYPES);

/** Map camera and phone file types onto the types the chat can actually read. */
export function normalizeChatAttachmentMime(
  mimeType: string,
  fileName?: string,
): ChatAttachmentMimeType | null {
  const raw = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (raw === "image/jpg" || raw === "image/pjpeg" || raw === "image/jfif") return "image/jpeg";
  if (raw === "text/csv" || raw === "text/markdown" || raw === "text/x-markdown") return "text/plain";
  if (ALLOWED.has(raw)) return raw as ChatAttachmentMimeType;

  const ext = fileName?.trim().toLowerCase().split(".").pop() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt" || ext === "csv" || ext === "md" || ext === "text") return "text/plain";
  return null;
}

/** Identify a file from its base64 header when the phone leaves the type blank. */
export function sniffChatAttachmentMime(base64: string): ChatAttachmentMimeType | null {
  const head = base64.replace(/\s/g, "").slice(0, 16);
  if (head.startsWith("/9j/")) return "image/jpeg";
  if (head.startsWith("iVBOR")) return "image/png";
  if (head.startsWith("R0lGOD")) return "image/gif";
  if (head.startsWith("UklGR")) return "image/webp";
  if (head.startsWith("JVBER")) return "application/pdf";
  return null;
}

export function isHeicAttachment(mimeType: string, fileName?: string): boolean {
  const raw = mimeType.toLowerCase();
  const name = (fileName ?? "").toLowerCase();
  return raw.includes("heic") || raw.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
}
