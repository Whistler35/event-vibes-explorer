import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';

interface CollapsibleCarouselProps {
  children: React.ReactNode;
  /** px height when expanded (the carousel content area) */
  expandedHeight?: number;
  /** px height when collapsed — only the handle peeks */
  collapsedHeight?: number;
}

/**
 * Bottom-anchored draggable sheet with two snap points.
 * Exposes the current sheet height via the CSS variable `--carousel-h`
 * on the document root so other map controls (GPS, +) can sit above it.
 */
const CollapsibleCarousel: React.FC<CollapsibleCarouselProps> = ({
  children,
  expandedHeight = 280,
  collapsedHeight = 36,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [dragOffset, setDragOffset] = useState(0); // negative = dragging down (shrink)
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startExpandedRef = useRef(true);

  const currentHeight = expanded ? expandedHeight : collapsedHeight;
  const visualHeight = Math.max(
    collapsedHeight,
    Math.min(expandedHeight, currentHeight + dragOffset)
  );

  // Publish height as CSS var so map controls can stay above the sheet
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--carousel-h', `${visualHeight}px`);
    return () => {
      root.style.removeProperty('--carousel-h');
    };
  }, [visualHeight]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startExpandedRef.current = expanded;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [expanded]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - startYRef.current;
    // dragging down (positive dy) shrinks the sheet
    setDragOffset(-dy);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    const finalH = (startExpandedRef.current ? expandedHeight : collapsedHeight) + dragOffset;
    const mid = (expandedHeight + collapsedHeight) / 2;
    setExpanded(finalH > mid);
    setDragOffset(0);
  }, [dragOffset, expandedHeight, collapsedHeight]);

  return (
    <div
      className="bg-card/95 backdrop-blur-xl border-t border-border/60 rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)]"
      style={{
        height: visualHeight,
        transition: draggingRef.current ? 'none' : 'height 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden',
        touchAction: 'pan-x',
      }}
    >
      {/* Drag handle area */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          // Tap toggles when not dragged
          if (Math.abs(dragOffset) < 4) setExpanded(v => !v);
        }}
        className="w-full h-9 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
        role="button"
        aria-label={expanded ? 'Karusell einklappen' : 'Karusell ausklappen'}
      >
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
        {!expanded && (
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <ChevronUp className="w-3 h-3" />
            Events
          </div>
        )}
      </div>
      {/* Content */}
      <div style={{ opacity: expanded ? 1 : 0, transition: 'opacity 0.2s ease' }}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCarousel;
