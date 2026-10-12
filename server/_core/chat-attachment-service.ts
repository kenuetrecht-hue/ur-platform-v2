import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  normalizeChatAttachmentMime,
  sniffChatAttachmentMime,
} from "../../lib/chat-attachment-mime";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_COUNT,
  CHAT_ATTACHMENT_MIME_TYPES,
  type ChatAttachmentInput,
  type ChatAttachmentMimeType,
} from "../../lib/chat-attachment-types";

function stripDataUrlPrefix(raw: string): string {
  const trimmed = raw.trim();
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

function estimateDecodedBytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export const chatAttachmentSchema = z.object({
  mimeType: z.string().trim().min(3).max(64),
  base64: z.string().min(4).max(6_000_000),
  fileName: z.string().trim().max(120).optional(),
});

export type SanitizedChatAttachment = {
  mimeType: ChatAttachmentMimeType;
  base64: string;
  fileName?: string;
};

export function sanitizeChatAttachments(
  raw: ChatAttachmentInput[] | undefined,
): SanitizedChatAttachment[] {
  if (!raw?.length) return [];

  if (raw.length > CHAT_ATTACHMENT_MAX_COUNT) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `At most ${CHAT_ATTACHMENT_MAX_COUNT} attachments per message.`,
    });
  }

  const allowed = new Set<string>(CHAT_ATTACHMENT_MIME_TYPES);
  const out: SanitizedChatAttachment[] = [];

  for (const item of raw) {
    const base64 = stripDataUrlPrefix(item.base64);
    if (!base64 || !/^[A-Za-z0-9+/=\s]+$/.test(base64.replace(/\s/g, ""))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid attachment encoding.",
      });
    }

    const normalized = base64.replace(/\s/g, "");
    const mimeType =
      normalizeChatAttachmentMime(item.mimeType, item.fileName) ??
      sniffChatAttachmentMime(normalized);
    if (!mimeType || !allowed.has(mimeType)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Unsupported attachment type. Use a photo, PDF, or text file.",
      });
    }

    const bytes = estimateDecodedBytes(normalized);
    if (bytes <= 0 || bytes > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Each attachment must be under ${Math.round(CHAT_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB.`,
      });
    }

    const fileName =
      typeof item.fileName === "string" && item.fileName.trim()
        ? item.fileName.trim().slice(0, 120)
        : undefined;

    out.push({
      mimeType: mimeType as ChatAttachmentMimeType,
      base64: normalized,
      fileName,
    });
  }

  return out;
}
