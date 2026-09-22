import type { TextStyle, ViewStyle } from "react-native";

/** Visible rows on website and phone. */
export const CHAT_COMPOSER_LINES = 12;
export const CHAT_COMPOSER_HEIGHT = 300;
export const CHAT_COMPOSER_MAX_HEIGHT = 600;

/** Mic / input / send sit in one row. Input grows; buttons never shrink off-screen. */
export const CHAT_COMPOSER_ACTION_ROW: ViewStyle = {
  flexDirection: "row",
  alignItems: "flex-end",
  flexWrap: "nowrap",
  gap: 8,
  width: "100%",
  flexShrink: 0,
  zIndex: 9,
};

/** Outer frame — shares the row with mic and Send. Do not use width 100%. */
export const CHAT_COMPOSER_FRAME: ViewStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minWidth: 0,
  height: CHAT_COMPOSER_HEIGHT,
  minHeight: CHAT_COMPOSER_HEIGHT,
  maxHeight: CHAT_COMPOSER_MAX_HEIGHT,
};

/** Shared chat box — tall enough to read a long prompt. */
export const CHAT_COMPOSER_INPUT: TextStyle = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
  minWidth: 0,
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
  flexShrink: 0,
  borderRadius: 14,
  paddingHorizontal: 18,
  paddingVertical: 14,
  minWidth: 72,
  minHeight: 52,
  justifyContent: "center",
  alignItems: "center",
};
