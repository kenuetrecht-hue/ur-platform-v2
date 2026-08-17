import React from "react";
import { View, Text, Pressable, Linking, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { ChatSearchCitation } from "@/lib/chat-attachment-types";

type Props = {
  citations: ChatSearchCitation[];
};

export function AiChatSearchCitations({ citations }: Props) {
  const colors = useColors();
  if (!citations.length) return null;

  return (
    <View
      style={{
        marginTop: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: 8,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 }}>
        🔍 WEB SEARCH SOURCES
      </Text>
      {citations.map((c, i) => (
        <Pressable
          key={`${c.url}-${i}`}
          onPress={() => {
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.open(c.url, "_blank", "noopener,noreferrer");
            } else {
              void Linking.openURL(c.url);
            }
          }}
          style={{ gap: 2 }}
        >
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }} numberOfLines={2}>
            {c.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 10 }} numberOfLines={2}>
            {c.source} — {c.description}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
