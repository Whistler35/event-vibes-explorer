import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import type { MapEvent } from './InteractiveMap';

interface EventCarouselProps {
  events: MapEvent[];
  selectedId: number | string | null;
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
const CARD_WIDTH = 240;          // px
const CARD_GAP = -36;            // negative = overlap
const STEP = CARD_WIDTH + CARD_GAP;

const EventCarousel: React.FC<EventCarouselProps> = ({ events, selectedId, onSelect, onExpand }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [activeIdx, setActiveIdx] = useState(0);
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

  // Sync to externally selected id (e.g. marker tap)
  useEffect(() => {
    if (!scrollRef.current || selectedId == null || isUserScrollingRef.current) return;
    const idx = events.findIndex(e => String(e.id) === String(selectedId));
    if (idx < 0) return;
    setActiveIdx(idx);
    const target = idx * STEP - (containerWidth / 2 - CARD_WIDTH / 2);
    scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
  }, [selectedId, events, containerWidth]);

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    isUserScrollingRef.current = true;
    const container = scrollRef.current;
    // Compute active index from scrollLeft
    const center = container.scrollLeft + containerWidth / 2;
    const idx = Math.round((center - CARD_WIDTH / 2) / STEP);
    const clamped = Math.max(0, Math.min(events.length - 1, idx));
    if (clamped !== activeIdx) setActiveIdx(clamped);

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const ev = events[clamped];
      if (ev && String(ev.id) !== String(selectedId)) onSelect(ev);
      isUserScrollingRef.current = false;
    }, 140);
  }, [events, activeIdx, containerWidth, selectedId, onSelect]);

  if (events.length === 0) return null;

  // Padding so first/last cards can reach center
  const sidePad = Math.max(0, containerWidth / 2 - CARD_WIDTH / 2);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex items-end overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth touch-pan-x overscroll-contain"
      style={{
        WebkitOverflowScrolling: 'touch',
        paddingLeft: sidePad,
        paddingRight: sidePad,
        paddingTop: 32,
        paddingBottom: 8,
        gap: `${CARD_GAP}px`,
      }}
    >
      {events.map((ev, i) => {
        const offset = i - activeIdx;            // -2,-1,0,1,2
        const abs = Math.abs(offset);
        const isCenter = abs < 0.5;
        // Arc curve: center is up, sides drop & rotate slightly
        const translateY = Math.min(28, abs * abs * 8);   // px down
        const rotate = offset * -4;                        // deg
        const scale = isCenter ? 1 : Math.max(0.86, 1 - abs * 0.07);
        const opacity = isCenter ? 1 : Math.max(0.55, 1 - abs * 0.18);
        const z = 100 - abs;

        return (
          <button
            key={ev.id}
            onClick={() => {
              if (isCenter) onExpand(ev);
              else onSelect(ev);
            }}
            className="shrink-0 snap-center text-left rounded-3xl overflow-hidden bg-card border border-border/60"
            style={{
              width: CARD_WIDTH,
              transform: `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
              transformOrigin: 'bottom center',
              transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease, box-shadow 0.3s ease',
              opacity,
              zIndex: z,
              boxShadow: isCenter
                ? '0 18px 40px -12px hsl(var(--primary) / 0.35), 0 8px 20px rgba(0,0,0,0.18)'
                : '0 8px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div className="relative h-44 bg-muted">
              {ev.image ? (
                <img src={ev.image} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
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
            <div className="px-3.5 py-3 space-y-1.5">
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
    </div>
  );
};

export default EventCarousel;
