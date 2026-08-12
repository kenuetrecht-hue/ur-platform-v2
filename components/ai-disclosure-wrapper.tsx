import React from "react";
import { View, Text, Pressable, StyleSheet, type TextStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  AFFILIATE_LINK_BEFORE_TEXT,
  buildAiChatDisclosure,
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
          {buildAiChatDisclosure(aiName)}
          {hasAffiliateLinks ? `\n${AFFILIATE_LINK_BEFORE_TEXT}` : ""}
        </DisclosureLine>
      </View>

      <View style={styles.contentSlot}>{children}</View>
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
