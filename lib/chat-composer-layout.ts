import type { TextStyle, ViewStyle } from "react-native";

/** Shared chat box — large enough to read while you type, on every AI desk. */
export const CHAT_COMPOSER_INPUT: TextStyle = {
  flex: 1,
  minHeight: 104,
  maxHeight: 220,
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
