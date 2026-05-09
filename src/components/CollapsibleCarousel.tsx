import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';

interface CollapsibleCarouselProps {
  children: React.ReactNode;
  /** px height when expanded (the carousel content area) */
  expandedHeight?: number;
  /** px height when collapsed — only the handle peeks */
  collapsedHeight?: number;
  /** Increment to force the carousel to expand (e.g. on marker tap) */
  expandTrigger?: number;
  /** When true, automatically collapse the carousel until set false again.
   *  User can still manually drag it back open. */
  autoCollapse?: boolean;
}

/**
 * Bottom-anchored draggable carousel container with two snap points.
 */
const CollapsibleCarousel: React.FC<CollapsibleCarouselProps> = ({
  children,
  expandedHeight = 280,
  collapsedHeight = 28,
  expandTrigger = 0,
  autoCollapse = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [dragOffset, setDragOffset] = useState(0); // negative = shrinking
  const [blockChildClicks, setBlockChildClicks] = useState(false);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startExpandedRef = useRef(true);
  const movedRef = useRef(false);
  const userOverrideRef = useRef(false);

  // External force-expand (e.g. user taps a marker on the map)
  useEffect(() => {
    if (expandTrigger > 0) {
      userOverrideRef.current = false;
      setExpanded(true);
    }
  }, [expandTrigger]);

  // Auto-collapse / auto-expand based on availability of carousel items.
  // Reset user override on every flip so behavior is responsive.
  useEffect(() => {
    userOverrideRef.current = false;
    setExpanded(!autoCollapse);
  }, [autoCollapse]);

  const baseHeight = expanded ? expandedHeight : collapsedHeight;
  const visualHeight = Math.max(
    collapsedHeight,
    Math.min(expandedHeight, baseHeight + dragOffset)
  );

  // Publish height as CSS var so map controls (GPS, +) can stay above
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--carousel-h', `${visualHeight}px`);
    return () => { root.style.removeProperty('--carousel-h'); };
  }, [visualHeight]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    movedRef.current = false;
    startYRef.current = e.clientY;
    startExpandedRef.current = expanded;
    // Pre-emptively block child clicks for the duration of any drag —
    // prevents the first event from opening when the user pulls the carousel up.
    setBlockChildClicks(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [expanded]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dy) > 4) movedRef.current = true;
    setDragOffset(-dy);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    if (!movedRef.current) {
      // Treat as tap → toggle. Release the click block immediately so child taps work normally next time.
      userOverrideRef.current = true;
      setExpanded(v => !v);
      setDragOffset(0);
      setTimeout(() => setBlockChildClicks(false), 50);
      return;
    }
    // After a real drag, keep child clicks blocked a bit longer
    // so the synthesized click after pointerup doesn't open an event card.
    setTimeout(() => setBlockChildClicks(false), 400);
    const finalH = (startExpandedRef.current ? expandedHeight : collapsedHeight) + dragOffset;
    const mid = (expandedHeight + collapsedHeight) / 2;
    userOverrideRef.current = true;
    setExpanded(finalH > mid);
    setDragOffset(0);
  }, [dragOffset, expandedHeight, collapsedHeight]);

  return (
    <div
      style={{
        height: visualHeight,
        transition: draggingRef.current ? 'none' : 'height 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        // No background, no border, no shadow — let the cards float on the map
      }}
    >
      {/* Drag handle — floats on the map */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="w-full h-8 flex flex-col items-center justify-end pb-0 pt-3 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        role="button"
        aria-label={expanded ? 'Karusell einklappen' : 'Karusell ausklappen'}
      >
        <div className="px-3 rounded-full bg-card/80 backdrop-blur-md shadow-sm border border-border/40 items-center py-[6px] flex flex-row gap-[4px] mx-0 my-0">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/50" />
          {!expanded && <ChevronUp className="w-3 h-3 text-muted-foreground" />}
        </div>
      </div>

      {/* Content — fades out when collapsed */}
      <div
        style={{
          opacity: expanded ? 1 : 0,
          pointerEvents: (expanded && !blockChildClicks) ? 'auto' : 'none',
          transition: 'opacity 0.18s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCarousel;
