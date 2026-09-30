import { useCallback, useRef, useState } from "react";
import { useKeyboardOpen } from "./useKeyboardOpen";

/**
 * Drives a chat-style "collapse the huddle/organization header once you've
 * scrolled into the messages (or the keyboard opens), show a compact bar you
 * can tap (or scroll back to top) to get it back" pattern — shared by
 * BlitzMatch and DirectChat so both behave the same way.
 *
 * The keyboard opening collapses the header unconditionally (not just past a
 * scroll threshold): with the keyboard up there usually isn't room for the
 * full header AND the messages AND the input all at once, and — like every
 * reference chat app — the input should win that space, not the org info.
 */
export function useCollapsibleHeader(threshold = 24) {
  const [scrolledToTop, setScrolledToTop] = useState(true);
  const keyboardOpen = useKeyboardOpen();
  const scrollRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrolledToTop(e.currentTarget.scrollTop <= threshold);
    },
    [threshold]
  );

  const expand = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { expanded: scrolledToTop && !keyboardOpen, scrollRef, onScroll, expand };
}
