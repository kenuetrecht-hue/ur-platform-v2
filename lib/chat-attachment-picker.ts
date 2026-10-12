import { Platform } from "react-native";
import {
  isHeicAttachment,
  normalizeChatAttachmentMime,
  sniffChatAttachmentMime,
} from "./chat-attachment-mime";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_COUNT,
  type ChatMessageAttachmentPreview,
} from "./chat-attachment-types";

export type PickedChatAttachment = ChatMessageAttachmentPreview & {
  base64: string;
};

export type ChatAttachmentSource = "camera" | "files";

const FILE_ACCEPT =
  "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.pdf,.txt,.csv,.md,application/pdf,text/plain,text/csv";

function decodedBytes(base64: string): number {
  const clean = base64.replace(/\s/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

function assertSize(bytes: number): void {
  if (bytes > CHAT_ATTACHMENT_MAX_BYTES) {
    throw new Error("File is too large (max 4 MB).");
  }
}

function finishAttachment(params: {
  mimeType: string;
  fileName?: string;
  base64: string;
  previewUri: string;
}): PickedChatAttachment {
  const clean = params.base64.replace(/\s/g, "");
  const sniffed = sniffChatAttachmentMime(clean);
  const mimeType =
    normalizeChatAttachmentMime(params.mimeType, params.fileName) ?? sniffed;
  if (!mimeType) {
    if (isHeicAttachment(params.mimeType, params.fileName)) {
      throw new Error("This photo is HEIC. Retake it as a JPEG, or choose a JPEG from your library.");
    }
    throw new Error("Use a photo, PDF, or text file.");
  }
  assertSize(decodedBytes(clean));
  return {
    mimeType,
    base64: clean,
    previewUri: params.previewUri,
    fileName: params.fileName,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function shrinkImageToJpeg(file: File): Promise<PickedChatAttachment> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Could not read that photo.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read that photo.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const comma = dataUrl.indexOf(",");
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
    if (!base64) throw new Error("Could not read that photo.");
    const stem = file.name.replace(/\.[^.]+$/, "") || "photo";
    return finishAttachment({
      mimeType: "image/jpeg",
      fileName: `${stem}.jpg`,
      base64,
      previewUri: dataUrl,
    });
  } finally {
    bitmap.close?.();
  }
}

async function readWebFile(file: File): Promise<PickedChatAttachment> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("File is too large (max 4 MB).");
  }

  const named = normalizeChatAttachmentMime(file.type, file.name);
  const imageLike =
    file.type.startsWith("image/") ||
    named?.startsWith("image/") ||
    isHeicAttachment(file.type, file.name);

  if (imageLike && file.type !== "image/gif" && named !== "image/gif") {
    try {
      return await shrinkImageToJpeg(file);
    } catch (error) {
      if (isHeicAttachment(file.type, file.name) || !named?.startsWith("image/")) {
        if (error instanceof Error && /too large/i.test(error.message)) throw error;
        throw new Error(
          isHeicAttachment(file.type, file.name)
            ? "This photo is HEIC. Retake it as a JPEG, or choose a JPEG from your library."
            : "Could not read that photo. Try a JPEG or PNG.",
        );
      }
    }
  }

  if (!named) {
    throw new Error("Use a photo, PDF, or text file.");
  }
  assertSize(file.size);
  const dataUrl = await readFileAsDataUrl(file);
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return finishAttachment({
    mimeType: named,
    fileName: file.name,
    base64,
    previewUri: dataUrl.startsWith("data:") ? dataUrl : `data:${named};base64,${base64}`,
  });
}

function pickWebFiles(source: ChatAttachmentSource): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = source === "files";
    if (source === "camera") {
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
    } else {
      input.accept = FILE_ACCEPT;
    }
    input.style.position = "fixed";
    input.style.left = "0";
    input.style.top = "0";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.opacity = "0";
    document.body.appendChild(input);

    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files.slice(0, CHAT_ATTACHMENT_MAX_COUNT));
    };

    input.addEventListener("change", () => {
      finish(Array.from(input.files ?? []));
    });
    input.addEventListener("cancel", () => finish([]));
    input.click();
  });
}

async function readNativeUri(uri: string): Promise<string> {
  const FileSystem = await import("expo-file-system");
  return new FileSystem.File(uri).base64();
}

async function fromNativeAsset(asset: {
  base64?: string | null;
  uri?: string;
  mimeType?: string | null;
  fileName?: string | null;
  name?: string | null;
}): Promise<PickedChatAttachment> {
  let base64 = asset.base64 ?? "";
  if (!base64 && asset.uri) {
    base64 = await readNativeUri(asset.uri);
  }
  if (!base64) {
    throw new Error("Could not read that file. Try again.");
  }
  const fileName = asset.fileName ?? asset.name ?? undefined;
  return finishAttachment({
    mimeType: asset.mimeType ?? "",
    fileName: fileName ?? undefined,
    base64,
    previewUri: asset.uri && asset.uri.length > 0 ? asset.uri : `data:application/octet-stream;base64,${base64}`,
  });
}

async function pickNative(source: ChatAttachmentSource): Promise<PickedChatAttachment[]> {
  let ImagePicker: typeof import("expo-image-picker");
  try {
    ImagePicker = await import("expo-image-picker");
  } catch {
    throw new Error(
      "Attachment picker unavailable. On mobile, install expo-image-picker and expo-document-picker, or use the web app.",
    );
  }

  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw new Error("Camera permission is required to take a photo.");
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return [];
    return Promise.all(result.assets.slice(0, 1).map((asset) => fromNativeAsset(asset)));
  }

  const choice = await new Promise<"photo" | "document" | null>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Alert } = require("react-native") as typeof import("react-native");
    Alert.alert("Attach a file", "Choose a photo or a document.", [
      { text: "Photo library", onPress: () => resolve("photo") },
      { text: "Document", onPress: () => resolve("document") },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
  if (!choice) return [];

  if (choice === "photo") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      throw new Error("Photo library permission is required.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: CHAT_ATTACHMENT_MAX_COUNT,
    });
    if (result.canceled || result.assets.length === 0) return [];
    return Promise.all(
      result.assets.slice(0, CHAT_ATTACHMENT_MAX_COUNT).map((asset) => fromNativeAsset(asset)),
    );
  }

  let DocumentPicker: typeof import("expo-document-picker");
  try {
    DocumentPicker = await import("expo-document-picker");
  } catch {
    throw new Error(
      "Attachment picker unavailable. On mobile, install expo-document-picker, or use the web app.",
    );
  }

  const doc = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*", "text/plain", "text/csv", "public.plain-text"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (doc.canceled || doc.assets.length === 0) return [];

  const FileSystem = await import("expo-file-system");
  const picked: PickedChatAttachment[] = [];
  for (const asset of doc.assets.slice(0, CHAT_ATTACHMENT_MAX_COUNT)) {
    const file = new FileSystem.File(asset.uri);
    if (file.exists && file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new Error("File is too large (max 4 MB).");
    }
    picked.push(
      await fromNativeAsset({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.name,
      }),
    );
  }
  return picked;
}

/** Take a photo or choose a file. The result is ready to show in the chat box. */
export async function pickChatAttachments(
  source: ChatAttachmentSource = "files",
): Promise<PickedChatAttachment[]> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const files = await pickWebFiles(source);
    if (files.length === 0) return [];
    return Promise.all(files.map(readWebFile));
  }
  return pickNative(source);
}

export function chatAttachmentPayload(files: PickedChatAttachment[]) {
  return files.map((file) => ({
    mimeType: file.mimeType,
    base64: file.base64,
    fileName: file.fileName,
  }));
}

export function chatAttachmentCaption(
  files: Array<{ fileName?: string; mimeType: string }>,
  typed: string,
): string {
  const text = typed.trim();
  if (text) return text;
  if (files.length === 1) {
    return `Attached ${files[0]?.fileName ?? "file"}`;
  }
  return `Attached ${files.length} files`;
}
