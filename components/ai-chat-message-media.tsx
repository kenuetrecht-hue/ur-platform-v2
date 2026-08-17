import React from "react";
import { View, Text, Image } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { ChatMessageAttachmentPreview } from "@/lib/chat-attachment-types";
import { getApiBaseUrl } from "@/constants/oauth";

type Props = {
  attachments?: ChatMessageAttachmentPreview[];
  generatedImageUrl?: string;
};

function resolveImageUri(uri: string): string {
  if (uri.startsWith("http") || uri.startsWith("data:") || uri.startsWith("blob:")) {
    return uri;
  }
  const base = getApiBaseUrl()?.replace(/\/$/, "") ?? "";
  return `${base}${uri.startsWith("/") ? uri : `/${uri}`}`;
}

export function AiChatMessageMedia({ attachments, generatedImageUrl }: Props) {
  const colors = useColors();

  return (
    <View style={{ marginTop: 8, gap: 8 }}>
      {attachments?.map((att, i) => {
        const isPdf = att.mimeType === "application/pdf";
        if (isPdf) {
          return (
            <View
              key={`pdf-${i}`}
              style={{
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>
                📄 {att.fileName ?? "Document.pdf"}
              </Text>
            </View>
          );
        }

        return (
          <Image
            key={`img-${i}`}
            source={{ uri: att.previewUri }}
            style={{
              width: "100%",
              maxWidth: 280,
              height: 180,
              borderRadius: 8,
              backgroundColor: colors.surface,
            }}
            resizeMode="cover"
            accessibilityLabel={att.fileName ?? "Attached image"}
          />
        );
      })}

      {generatedImageUrl ? (
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>🎨 GENERATED IMAGE</Text>
          <Image
            source={{ uri: resolveImageUri(generatedImageUrl) }}
            style={{ width: "100%", maxWidth: 280, height: 280, borderRadius: 8 }}
            resizeMode="contain"
            accessibilityLabel="AI generated image"
          />
        </View>
      ) : null}
    </View>
  );
}
