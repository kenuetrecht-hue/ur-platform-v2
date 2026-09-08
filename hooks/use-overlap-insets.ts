import { useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import {
  LAYOUT_OVERLAP,
  androidBottomBuffer,
  bottomTabChromeHeight,
  composerDockPadding,
  keyboardAvoidingBehavior,
  keyboardOffsetForTabScreen,
} from "@/lib/layout-overlap";

export type OverlapInsetsOptions = {
  /** Reserve space above the bottom tab bar. Default true. */
  reserveTabBar?: boolean;
  /** Pixels of fixed UI above the chat panel (headers, toggles). */
  headerChromeHeight?: number;
};

/**
 * Central overlap insets for tab screens — iPhone, Android, Samsung.
 * Use on chat composers, KeyboardAvoidingView, and scroll content padding.
 */
export function useOverlapInsets(options: OverlapInsetsOptions = {}) {
  const { reserveTabBar = true, headerChromeHeight = 0 } = options;
  const insets = useSafeAreaInsets();
  const tabBarFromContext = useContext(BottomTabBarHeightContext);
  const tabBarFromNav =
    reserveTabBar && typeof tabBarFromContext === "number" ? tabBarFromContext : 0;

  const expectedChrome = bottomTabChromeHeight(insets.bottom);
  const tabBarHeight = reserveTabBar
    ? tabBarFromNav > 0
      ? Math.max(tabBarFromNav, expectedChrome)
      : expectedChrome
    : 0;

  const androidBuffer = androidBottomBuffer(insets.bottom);
  const dockPaddingBottom = composerDockPadding({
    reserveTabBar,
    reportedTabBarHeight: tabBarFromNav,
    bottomSafeInset: insets.bottom,
    androidBuffer,
  });
  const scrollPaddingBottom = LAYOUT_OVERLAP.COMPOSER_MIN_PADDING + LAYOUT_OVERLAP.COMPOSER_DOCK_GAP;

  return {
    insets,
    tabBarHeight,
    androidBuffer,
    /** Bottom inset for composer only — tab navigator already clears the tab bar. */
    composerBottomInset: dockPaddingBottom,
    dockPaddingBottom,
    scrollPaddingBottom,
    keyboardVerticalOffset: keyboardOffsetForTabScreen(insets.top, headerChromeHeight),
    keyboardBehavior: keyboardAvoidingBehavior(),
  };
}
