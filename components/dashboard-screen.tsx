import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { TabPageScroll } from "@/components/tab-page-scroll";

type Props = {
  header?: ReactNode;
  /** Horizontal pill row for secondary navigation. Stays under the header. */
  subnav?: ReactNode;
  children: ReactNode;
  /**
   * Chat input footer. When set, children are the flexible middle (message history)
   * and this footer stays pinned above the tab bar or beside the sidebar.
   */
  footer?: ReactNode;
  /** Wrap the scrolling body in a floating card. Chat columns pass false. */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Universal page shell: header, pill sub-nav, scrolling body, optional fixed footer.
 * Nothing in the body is given a fixed pixel height.
 */
export function DashboardScreen({
  header,
  subnav,
  children,
  footer,
  card = true,
  style,
}: Props) {
  return (
    <View style={[styles.shell, style]}>
      {header}
      {subnav}
      {footer ? (
        <View style={styles.fill}>
          <View style={styles.fill}>{children}</View>
          {footer}
        </View>
      ) : (
        <TabPageScroll card={card}>{children}</TabPageScroll>
      )}
    </View>
  );
}

const styles = {
  shell: {
    flex: 1,
    minHeight: 0,
  } as ViewStyle,
  fill: {
    flex: 1,
    minHeight: 0,
  } as ViewStyle,
};
