import { useCallback, useRef, useState } from "react";

/**
 * Drives a chat-style "collapse the huddle/organization header once you've
 * scrolled into the messages, show a compact bar you can tap (or scroll back
 * to top) to get it back" pattern — shared by BlitzMatch and DirectChat so
 * both behave the same way.
 */
export function useCollapsibleHeader(threshold = 24) {
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setExpanded(e.currentTarget.scrollTop <= threshold);
    },
    [threshold]
  );

  const expand = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return { expanded, scrollRef, onScroll, expand };
}
