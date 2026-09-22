import type { ReactNode } from "react";
import { Platform, ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Tab-screen page scroll. The window stays put; this view is the thing that
 * moves up and down so full-size tiles, chat boxes, and talk controls stay
 * on the page and you can reach them by scrolling.
 */
export function TabPageScroll({ children, contentContainerStyle }: Props) {
  const overlap = useOverlapInsets();
  const padBottom = 28 + overlap.scrollPaddingBottom;

  return (
    <ScrollView
      {...(Platform.OS === "web" ? { className: "ur-page-scroll" } : null)}
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: padBottom }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      alwaysBounceVertical
      showsVerticalScrollIndicator
      testID="tab-page-scroll"
    >
      {children}
    </ScrollView>
  );
}

const styles = {
  scroll: {
    flex: 1,
    minHeight: 0,
  } as ViewStyle,
  content: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  } as ViewStyle,
};
