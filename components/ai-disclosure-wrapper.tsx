import React from "react";
import { View, Text, StyleSheet, type TextStyle } from "react-native";
import {
  AFFILIATE_LINK_BEFORE_TEXT,
  buildAiChatDisclosure,
} from "@/lib/platform-disclosure-copy";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";

export interface AIDisclosureWrapperProps {
  children: React.ReactNode;
  aiName: string;
  hasAffiliateLinks?: boolean;
  affiliateDisclosureText?: string;
  onDismiss?: () => void;
  /** Sit in the page instead of a fixed-height slot, so the chat does not cover the page. */
  page?: boolean;
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
  page = false,
}: AIDisclosureWrapperProps) {
  const noteStyle: TextStyle = {
    color: LETTERING_ON_WHITE,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    letterSpacing: 0.12,
  };

  const dividerStyle = {
    backgroundColor: "#FFFFFF",
    borderColor: "#E0E7FF",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 14,
  };

  return (
    <View style={page ? styles.page : styles.root}>
      <View style={dividerStyle}>
        <DisclosureLine textStyle={noteStyle}>
          {buildAiChatDisclosure(aiName)}
          {hasAffiliateLinks ? `\n${AFFILIATE_LINK_BEFORE_TEXT}` : ""}
        </DisclosureLine>
      </View>

      <View style={page ? styles.pageSlot : styles.contentSlot}>{children}</View>
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
  page: {
    width: "100%",
    gap: 8,
  },
  pageSlot: {
    width: "100%",
    overflow: "visible",
  },
});
