import React from "react";
import { Image, Pressable, Text, View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { CHAT_ATTACHMENT_MAX_COUNT } from "@/lib/chat-attachment-types";
import {
  pickChatAttachments,
  type ChatAttachmentSource,
  type PickedChatAttachment,
} from "@/lib/chat-attachment-picker";

export function ChatPendingAttachments({
  pending,
  onRemove,
}: {
  pending: PickedChatAttachment[];
  onRemove: (index: number) => void;
}) {
  const colors = useColors();
  if (pending.length === 0) return null;

  return (
    <View style={styles.row}>
      {pending.map((att, index) => {
        const isImage = att.mimeType.startsWith("image/");
        return (
          <View
            key={`${att.fileName ?? att.mimeType}-${index}`}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            {isImage ? (
              <Image
                source={{ uri: att.previewUri }}
                style={styles.thumb}
                accessibilityLabel={att.fileName ?? "Photo ready to send"}
              />
            ) : (
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }} numberOfLines={2}>
                {att.fileName ?? "Document"}
              </Text>
            )}
            <Pressable
              onPress={() => onRemove(index)}
              hitSlop={8}
              accessibilityLabel="Remove attachment"
            >
              <Text style={{ color: colors.error, fontSize: 12, fontWeight: "700" }}>Remove</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function ChatAttachButtons({
  disabled,
  count,
  onPicked,
  onError,
  buttonStyle,
}: {
  disabled?: boolean;
  count: number;
  onPicked: (files: PickedChatAttachment[]) => void;
  onError: (message: string) => void;
  buttonStyle?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const full = count >= CHAT_ATTACHMENT_MAX_COUNT;

  const add = async (source: ChatAttachmentSource) => {
    if (disabled || full) return;
    try {
      const picked = await pickChatAttachments(source);
      if (picked.length === 0) return;
      onPicked(picked);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not attach file.");
    }
  };

  const style = [
    styles.button,
    buttonStyle,
    {
      borderColor: colors.border,
      backgroundColor: colors.surface,
      opacity: disabled || full ? 0.45 : 1,
    },
  ];

  return (
    <>
      <Pressable
        accessibilityLabel="Take photo"
        disabled={disabled || full}
        onPress={() => void add("camera")}
        style={style}
      >
        <Text style={{ fontSize: 18 }}>📷</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Attach a file"
        disabled={disabled || full}
        onPress={() => void add("files")}
        style={style}
      >
        <Text style={{ fontSize: 18 }}>📎</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  chip: {
    width: 96,
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    gap: 4,
  },
  thumb: {
    width: "100%",
    height: 72,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
