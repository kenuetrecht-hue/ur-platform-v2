import React from "react";
import { View, Text, Pressable, StyleSheet, type TextStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  AFFILIATE_LINK_AFTER_TEXT,
  AFFILIATE_LINK_BEFORE_TEXT,
} from "@/lib/platform-disclosure-copy";
import { brandDisclosureSurface, withAlpha } from "@/lib/brand-theme";

export interface AIDisclosureWrapperProps {
  children: React.ReactNode;
  aiName: string;
  hasAffiliateLinks?: boolean;
  affiliateDisclosureText?: string;
  onDismiss?: () => void;
}

function DisclosureLine({
  children,
  textStyle,
}: {
  children: React.ReactNode;
  textStyle: TextStyle;
}) {
  return (
    <Text style={textStyle} numberOfLines={4}>
      {children}
    </Text>
  );
}

/**
 * Wraps AI-generated content with subtle before/after disclaimers.
 */
export function AIDisclosureWrapper({
  children,
  aiName,
  hasAffiliateLinks = false,
  affiliateDisclosureText,
  onDismiss,
}: AIDisclosureWrapperProps) {
  const colors = useColors();
  const brand = brandDisclosureSurface(colors);

  const noteStyle: TextStyle = {
    color: withAlpha(colors.muted, 0.92),
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    letterSpacing: 0.12,
    opacity: 0.78,
  };

  const dividerStyle = {
    ...brand,
    paddingVertical: 5,
    paddingHorizontal: 14,
  };

  return (
    <View style={styles.root}>
      <View style={dividerStyle}>
        <DisclosureLine textStyle={noteStyle}>
          {`You're chatting with ${aiName}, an AI companion · For education & entertainment, not professional advice`}
          {hasAffiliateLinks ? `\n${AFFILIATE_LINK_BEFORE_TEXT}` : ""}
        </DisclosureLine>
      </View>

      <View style={styles.contentSlot}>{children}</View>

      <View style={dividerStyle}>
        <DisclosureLine textStyle={noteStyle}>
          {`End of ${aiName} response · See Terms of Service for our AI disclosure policy`}
          {hasAffiliateLinks
            ? `\n${affiliateDisclosureText ?? AFFILIATE_LINK_AFTER_TEXT}`
            : ""}
        </DisclosureLine>
      </View>

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => ({
            marginTop: 4,
            paddingVertical: 6,
            paddingHorizontal: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            Dismiss
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  contentSlot: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
  },
});
