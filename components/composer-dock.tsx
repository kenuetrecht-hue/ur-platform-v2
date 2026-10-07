import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";
import { CHAT_COMPOSER_ACTION_ROW } from "@/lib/chat-composer-layout";

type ComposerDockProps = {
  children?: ReactNode;
  /** Mic, text box, and Send — keep this last so it sits just above the tab bar. */
  actionRow?: ReactNode;
  paddingBottom?: number;
  style?: StyleProp<ViewStyle>;
  reserveTabBar?: boolean;
  /** Stick to the bottom of the screen. Page chats leave this off so later sections stay visible. */
  pinned?: boolean;
};

type ChatComposerActionRowProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra web class. The base row class stays on. */
  webClassName?: string;
};

/** Mic + prompt + Send in one unwrapping row. */
export function ChatComposerActionRow({ children, style, webClassName }: ChatComposerActionRowProps) {
  return (
    <View
      {...(Platform.OS === "web"
        ? { className: ["ur-chat-composer-row", webClassName].filter(Boolean).join(" ") }
        : null)}
      style={[styles.actionRow, style]}
    >
      {children}
    </View>
  );
}

/**
 * Fixed chat footer. Sits above the tab / home bar and lifts with the keyboard
 * so Send stays tappable on every AI desk.
 */
export function ComposerDock({
  children,
  actionRow,
  paddingBottom,
  style,
  reserveTabBar = true,
  pinned = true,
}: ComposerDockProps) {
  const overlap = useOverlapInsets({ reserveTabBar });
  const pad = paddingBottom ?? overlap.dockPaddingBottom;

  return (
    <KeyboardAvoidingView
      behavior={overlap.keyboardBehavior}
      keyboardVerticalOffset={overlap.keyboardVerticalOffset}
      style={styles.avoid}
    >
      <View
        {...(Platform.OS === "web"
          ? { className: pinned ? "ur-chat-composer-footer" : "ur-chat-composer-footer ur-chat-composer-inline" }
          : null)}
        style={[
          styles.dock,
          {
            backgroundColor: "#FFFFFF",
            borderColor: "#E0E7FF",
            paddingBottom: pad,
          },
          style,
        ]}
      >
        {children}
        {actionRow}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avoid: {
    flexShrink: 0,
    width: "100%",
    zIndex: 8,
  },
  dock: {
    flexShrink: 0,
    width: "100%",
    marginTop: 8,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    zIndex: 8,
  },
  actionRow: {
    ...CHAT_COMPOSER_ACTION_ROW,
  },
});
