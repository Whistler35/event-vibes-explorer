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
}

/**
 * Bottom-anchored draggable carousel container with two snap points.
 * Transparent — no card chrome — so the floating EventCarousel cards
 * appear to sit directly on the map. Exposes `--carousel-h` so the
 * GPS / + buttons can stay above it.
 */
const CollapsibleCarousel: React.FC<CollapsibleCarouselProps> = ({
  children,
  expandedHeight = 280,
  collapsedHeight = 28,
  expandTrigger = 0,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [dragOffset, setDragOffset] = useState(0); // negative = shrinking
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startExpandedRef = useRef(true);
  const movedRef = useRef(false);

  // External force-expand (e.g. user taps a marker on the map)
  useEffect(() => {
    if (expandTrigger > 0) setExpanded(true);
  }, [expandTrigger]);

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
      // Treat as tap → toggle
      setExpanded(v => !v);
      setDragOffset(0);
      return;
    }
    const finalH = (startExpandedRef.current ? expandedHeight : collapsedHeight) + dragOffset;
    const mid = (expandedHeight + collapsedHeight) / 2;
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
          pointerEvents: expanded ? 'auto' : 'none',
          transition: 'opacity 0.18s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCarousel;
