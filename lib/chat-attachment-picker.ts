import { Platform } from "react-native";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MIME_TYPES,
  type ChatMessageAttachmentPreview,
} from "./chat-attachment-types";

export type PickedChatAttachment = ChatMessageAttachmentPreview & {
  base64: string;
};

function readFileAsBase64Web(file: File): Promise<PickedChatAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      reject(new Error("File is too large (max 4 MB)."));
      return;
    }

    const mimeType = file.type || "application/octet-stream";
    if (!CHAT_ATTACHMENT_MIME_TYPES.includes(mimeType as (typeof CHAT_ATTACHMENT_MIME_TYPES)[number])) {
      reject(new Error("Use JPEG, PNG, WebP, GIF, or PDF."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({
        mimeType,
        base64,
        previewUri: result.startsWith("data:") ? result : `data:${mimeType};base64,${base64}`,
        fileName: file.name,
      });
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

/** Cross-platform picker — web uses native file input; mobile uses Expo pickers when installed. */
export async function pickChatAttachments(): Promise<PickedChatAttachment[]> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = CHAT_ATTACHMENT_MIME_TYPES.join(",");
      input.multiple = true;
      input.style.display = "none";
      document.body.appendChild(input);

      input.onchange = async () => {
        const files = Array.from(input.files ?? []);
        document.body.removeChild(input);
        if (files.length === 0) {
          resolve([]);
          return;
        }
        try {
          const picked = await Promise.all(files.slice(0, 2).map(readFileAsBase64Web));
          resolve(picked);
        } catch (error) {
          reject(error);
        }
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        resolve([]);
      };

      input.click();
    });
  }

  try {
    const ImagePicker = await import("expo-image-picker");
    const DocumentPicker = await import("expo-document-picker");

    const choice = await new Promise<"photo" | "document" | null>((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Alert } = require("react-native") as typeof import("react-native");
      Alert.alert("Attach file", "Choose a photo or PDF.", [
        { text: "Photo", onPress: () => resolve("photo") },
        { text: "PDF / document", onPress: () => resolve("document") },
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
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: 2,
      });
      if (result.canceled) return [];

      return result.assets
        .filter((a) => a.base64)
        .slice(0, 2)
        .map((asset) => {
          const mimeType = asset.mimeType ?? "image/jpeg";
          const base64 = asset.base64!;
          return {
            mimeType,
            base64,
            previewUri: asset.uri,
            fileName: asset.fileName ?? undefined,
          };
        });
    }

    const doc = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (doc.canceled) return [];

    const FileSystem = await import("expo-file-system");
    const picked: PickedChatAttachment[] = [];

    for (const asset of doc.assets.slice(0, 2)) {
      const mimeType = asset.mimeType ?? "application/octet-stream";
      if (
        !CHAT_ATTACHMENT_MIME_TYPES.includes(mimeType as (typeof CHAT_ATTACHMENT_MIME_TYPES)[number])
      ) {
        continue;
      }
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (info.exists && "size" in info && info.size > CHAT_ATTACHMENT_MAX_BYTES) {
        throw new Error("File is too large (max 4 MB).");
      }
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64",
      });
      picked.push({
        mimeType,
        base64,
        previewUri: asset.uri,
        fileName: asset.name,
      });
    }

    return picked;
  } catch {
    throw new Error(
      "Attachment picker unavailable. On mobile, install expo-image-picker and expo-document-picker, or use the web app.",
    );
  }
}
