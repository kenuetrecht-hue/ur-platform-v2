import type { TextStyle, ViewStyle } from "react-native";

/** Visible rows on website and phone. */
export const CHAT_COMPOSER_LINES = 12;
export const CHAT_COMPOSER_HEIGHT = 300;
export const CHAT_COMPOSER_MAX_HEIGHT = 600;

/** Outer frame — same locked size on website and the native app. */
export const CHAT_COMPOSER_FRAME: ViewStyle = {
  flexGrow: 1,
  flexShrink: 0,
  minWidth: 0,
  width: "100%",
  height: CHAT_COMPOSER_HEIGHT,
  minHeight: CHAT_COMPOSER_HEIGHT,
  maxHeight: CHAT_COMPOSER_MAX_HEIGHT,
};

/** Shared chat box — tall enough to read a long prompt. Do not use flex:1 (that shrinks it). */
export const CHAT_COMPOSER_INPUT: TextStyle = {
  flexGrow: 1,
  flexShrink: 0,
  minWidth: 0,
  width: "100%",
  minHeight: CHAT_COMPOSER_HEIGHT,
  height: CHAT_COMPOSER_HEIGHT,
  maxHeight: CHAT_COMPOSER_MAX_HEIGHT,
  borderRadius: 14,
  borderWidth: 1,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 17,
  lineHeight: 24,
  textAlignVertical: "top",
};

export const CHAT_COMPOSER_SEND: ViewStyle = {
  borderRadius: 14,
  paddingHorizontal: 18,
  paddingVertical: 14,
  minHeight: 52,
  justifyContent: "center",
  alignItems: "center",
};
