import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import type { MapEvent } from './InteractiveMap';

interface EventCarouselProps {
  events: MapEvent[];
  selectedId: number | string | null;
  onInteractionStart?: () => void;
  onSelect: (event: MapEvent) => void;
  onExpand: (event: MapEvent) => void;
}

const categoryLabels: Record<string, string> = {
  music: 'Musik', sports: 'Sport', culture: 'Kultur', food: 'Food',
  nightlife: 'Nightlife', outdoor: 'Outdoor', community: 'Community',
  workshop: 'Workshop', other: 'Sonstiges',
};

const formatTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Heute · ${time}`;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ` · ${time}`;
};

// Card geometry
const CARD_WIDTH = 200;          // px
const CARD_GAP = 10;             // spacing between cards
const STEP = CARD_WIDTH + CARD_GAP;

const EventCarousel: React.FC<EventCarouselProps> = ({ events, selectedId, onInteractionStart, onSelect, onExpand }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef<number | null>(null);
  const isScrollingRef = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for centering math
  useEffect(() => {
    if (!scrollRef.current) return;
    const update = () => setContainerWidth(scrollRef.current?.clientWidth || 0);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollRef.current;
    if (!container || containerWidth === 0) return;
    const cards = container.querySelectorAll<HTMLElement>('[data-carousel-card]');
    const card = cards[idx];
    if (!card) return;
    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    const target = card.offsetLeft + card.offsetWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: target, behavior });
    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, behavior === 'smooth' ? 500 : 50);
  }, [containerWidth]);

  // Sync to externally selected id (e.g. marker tap) — but never while user is scrolling
  useEffect(() => {
    if (selectedId == null || isScrollingRef.current) return;
    const idx = events.findIndex(e => String(e.id) === String(selectedId));
    if (idx < 0 || idx === activeIdx) return;
    setActiveIdx(idx);
    scrollToIndex(idx);
  }, [selectedId, events, scrollToIndex, activeIdx]);

  // Find the card whose center is closest to the container's center.
  // More reliable than math based on STEP because it tolerates padding/gap drift.
  const computeCenterIdx = useCallback((): number => {
    const container = scrollRef.current;
    if (!container) return 0;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const cards = container.querySelectorAll<HTMLElement>('[data-carousel-card]');
    let bestIdx = 0;
    let bestDist = Infinity;
    cards.forEach((child, i) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - containerCenter);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    return Math.max(0, Math.min(events.length - 1, bestIdx));
  }, [events.length]);

  // High-performance scroll handler: rAF-throttled, no React state churn per frame
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    if (programmaticScrollRef.current) return;

    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      setIsScrolling(true);
      onInteractionStart?.();
    }

    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const idx = computeCenterIdx();
      setActiveIdx(prev => (prev === idx ? prev : idx));
    });

    // Settle detection: when scroll stops for 140ms → snap precisely, fire onSelect
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = setTimeout(() => {
      const container = scrollRef.current;
      if (!container) return;
      const idx = computeCenterIdx();
      const cards = container.querySelectorAll<HTMLElement>('[data-carousel-card]');
      const card = cards[idx];
      if (card) {
        const target = card.offsetLeft + card.offsetWidth / 2 - container.clientWidth / 2;
        const delta = Math.abs(container.scrollLeft - target);
        if (delta > 0.5) {
          // Precise snap to true center of nearest card
          programmaticScrollRef.current = true;
          if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
          container.scrollTo({ left: target, behavior: 'smooth' });
          programmaticTimerRef.current = setTimeout(() => {
            programmaticScrollRef.current = false;
            isScrollingRef.current = false;
            setIsScrolling(false);
            setActiveIdx(idx);
            const ev = events[idx];
            if (ev && String(ev.id) !== String(selectedId)) onSelect(ev);
          }, 320);
          return;
        }
      }
      isScrollingRef.current = false;
      setIsScrolling(false);
      setActiveIdx(idx);
      const ev = events[idx];
      if (ev && String(ev.id) !== String(selectedId)) onSelect(ev);
    }, 120);
  }, [events, computeCenterIdx, selectedId, onInteractionStart, onSelect]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
  }, []);

  if (events.length === 0) return null;

  // Padding so first/last cards can reach center
  const sidePad = Math.max(0, containerWidth / 2 - CARD_WIDTH / 2);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex items-end overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x overscroll-x-contain"
      style={{
        WebkitOverflowScrolling: 'touch',
        paddingTop: 32,
        paddingBottom: 32,
        gap: `${CARD_GAP}px`,
        contain: 'layout paint',
      }}
    >
      {/* Left spacer so first card can reach center */}
      <div aria-hidden style={{ flex: `0 0 ${sidePad}px` }} />
      {events.map((ev, i) => {
        const offset = i - activeIdx;
        const abs = Math.abs(offset);
        const isCenter = abs < 0.5;
        // Only consider neighbors for visual effect — distant cards stay static
        const visualAbs = Math.min(abs, 2);
        const scale = isCenter ? 1 : Math.max(0.92, 1 - visualAbs * 0.04);
        const opacity = isCenter ? 1 : Math.max(0.7, 1 - visualAbs * 0.15);

        return (
          <button
            key={ev.id}
            data-carousel-card
            onClick={(e) => {
              e.stopPropagation();
              if (isCenter) {
                onExpand(ev);
              } else {
                onInteractionStart?.();
                if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
                isScrollingRef.current = false;
                setIsScrolling(false);
                setActiveIdx(i);
                scrollToIndex(i);
                onSelect(ev);
              }
            }}
            className="shrink-0 snap-center text-left rounded-3xl overflow-hidden bg-card border border-border/60"
            style={{
              width: CARD_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: 'bottom center',
              transition: isScrolling
                ? 'none'
                : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, box-shadow 0.25s ease',
              opacity,
              willChange: 'transform',
              boxShadow: isCenter
                ? '0 18px 40px -12px hsl(var(--primary) / 0.35), 0 8px 20px rgba(0,0,0,0.18)'
                : '0 8px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div className="relative h-32 bg-muted">
              {ev.image ? (
                <img src={ev.image} alt="" className="w-full h-full object-cover" draggable={false} loading="lazy" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 my-0" />
              {ev.is_featured && (
                <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[hsl(var(--blitz-pink))] text-white text-[10px] font-bold uppercase tracking-wide shadow-md">
                  Top
                </span>
              )}
              {ev.category && (
                <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full bg-card/90 text-foreground text-[10px] font-semibold backdrop-blur">
                  {categoryLabels[ev.category] || ev.category}
                </span>
              )}
            </div>
            <div className="px-3 py-2 space-y-1">
              <h3 className="text-sm font-bold text-foreground line-clamp-1">{ev.title}</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="truncate">{formatTime(ev.event_date)}</span>
              </div>
              {ev.location_name && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{ev.location_name}</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
      {/* Right spacer so last card can reach center */}
      <div aria-hidden style={{ flex: `0 0 ${sidePad}px` }} />
    </div>
  );
};

export default EventCarousel;
