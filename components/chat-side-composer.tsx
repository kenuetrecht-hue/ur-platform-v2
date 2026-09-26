import { type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

import { ChatComposerActionRow } from "@/components/composer-dock";

/** Same desk as Administration: tools stacked on the left, writing box and Send beside them. */
export function ChatSideComposer({
  tools,
  children,
  send,
}: {
  tools?: ReactNode;
  children: ReactNode;
  send: ReactNode;
}) {
  return (
    <ChatComposerActionRow webClassName="ur-chat-composer-rail">
      {tools ? <View style={styles.toolRail}>{tools}</View> : null}
      <View style={styles.writingColumn}>
        {children}
        <View style={styles.sendWide}>{send}</View>
      </View>
    </ChatComposerActionRow>
  );
}

export const chatRailButtonStyle: ViewStyle = {
  width: "100%",
  height: 52,
  borderRadius: 14,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
};

const styles = {
  toolRail: {
    width: 88,
    flexShrink: 0,
    gap: 8,
  } satisfies ViewStyle,
  writingColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 180,
    gap: 8,
  } satisfies ViewStyle,
  sendWide: {
    alignSelf: "stretch",
    width: "100%",
  } satisfies ViewStyle,
};
