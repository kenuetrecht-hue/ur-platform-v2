// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for UR app.
 */
const MAPPING = {
  // Tab bar icons
  "house.fill": "home",
  "magnifyingglass": "search",
  "bubble.left.fill": "chat",
  "creditcard.fill": "credit-card",
  "gift.fill": "card-giftcard",
  "person.fill": "person",

  // Common UI icons
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "xmark": "close",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "checkmark.seal.fill": "verified",

  // Action icons
  "heart": "favorite-border",
  "heart.fill": "favorite",
  "star": "star-border",
  "star.fill": "star",
  "bell.fill": "notifications",
  "gear": "settings",
  "arrow.up.right": "open-in-new",
  "arrow.down": "arrow-downward",
  "arrow.up": "arrow-upward",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "minus": "remove",
  "trash": "delete",
  "pencil": "edit",
  "square.and.arrow.up": "share",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",

  // Money & rewards
  "dollarsign.circle.fill": "monetization-on",
  "trophy.fill": "emoji-events",
  "crown.fill": "workspace-premium",
  "sparkles": "auto-awesome",
  "slider.horizontal.3": "tune",

  // Communication
  "envelope.fill": "email",
  "phone.fill": "phone",
  "lock.fill": "lock",
  "lock.open.fill": "lock-open",
  "eye": "visibility",
  "eye.slash": "visibility-off",

  // Camera & media
  "camera.fill": "camera-alt",
  "photo": "image",
  "video.fill": "videocam",
  "mic.fill": "mic",

  // Status
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "questionmark.circle.fill": "help",
  "shield.fill": "shield",
  "link": "link",

  // Charts
  "chart.bar.fill": "bar-chart",
  "chart.line.uptrend.xyaxis": "trending-up",
  "person.2.fill": "people",
  "person.crop.circle": "account-circle",

  // Categories
  "figure.run": "directions-run",
  "music.note": "music-note",
  "book.fill": "menu-book",
  "paintbrush.fill": "brush",
  "gamecontroller.fill": "sports-esports",
  "briefcase.fill": "work",
  "heart.text.square.fill": "spa",

  // Misc
  "calendar": "calendar-today",
  "clock.fill": "schedule",
  "location.fill": "location-on",
  "tag.fill": "label",
  "flag.fill": "flag",
  "hand.raised.fill": "back-hand",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
