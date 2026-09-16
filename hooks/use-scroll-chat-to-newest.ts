import { useCallback, useEffect, useRef } from "react";
import type { ScrollView } from "react-native";

/** Keep the newest exchange (top of an inverted thread) on screen. */
export function useScrollChatToNewest(trigger: number) {
  const ref = useRef<ScrollView>(null);

  const scrollToNewest = useCallback(() => {
    const run = () => ref.current?.scrollTo({ y: 0, animated: true });
    requestAnimationFrame(run);
    setTimeout(run, 80);
  }, []);

  useEffect(() => {
    scrollToNewest();
  }, [trigger, scrollToNewest]);

  return { ref, scrollToNewest };
}
