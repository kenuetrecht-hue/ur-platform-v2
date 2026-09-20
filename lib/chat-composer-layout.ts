import type { TextStyle, ViewStyle } from "react-native";

/** Visible rows for the web <textarea> (defaults to 2 without this). */
export const CHAT_COMPOSER_LINES = 10;

/** Shared chat box — tall enough to read a long prompt while you type. */
export const CHAT_COMPOSER_INPUT: TextStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: 240,
  height: 240,
  maxHeight: 480,
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
