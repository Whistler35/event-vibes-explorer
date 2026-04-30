import React, { useEffect, useRef } from 'react';
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

const EventCarousel: React.FC<EventCarouselProps> = ({ events, selectedId, onSelect, onExpand }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to selected card when selection changes externally (marker tap)
  useEffect(() => {
    if (!scrollRef.current || selectedId == null || isUserScrollingRef.current) return;
    const idx = events.findIndex(e => String(e.id) === String(selectedId));
    if (idx < 0) return;
    const el = scrollRef.current.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedId, events]);

  // Detect snap & emit selection
  const onScroll = () => {
    if (!scrollRef.current) return;
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollRef.current!;
      const center = container.scrollLeft + container.clientWidth / 2;
      let closest = 0;
      let closestDist = Infinity;
      Array.from(container.children).forEach((c, i) => {
        const el = c as HTMLElement;
        const elCenter = el.offsetLeft + el.clientWidth / 2;
        const d = Math.abs(elCenter - center);
        if (d < closestDist) {
          closestDist = d;
          closest = i;
        }
      });
      const ev = events[closest];
      if (ev && String(ev.id) !== String(selectedId)) onSelect(ev);
      isUserScrollingRef.current = false;
    }, 120);
  };

  if (events.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-[15%] py-2 touch-pan-x overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {events.map((ev) => {
        const isSelected = String(ev.id) === String(selectedId);
        return (
          <button
            key={ev.id}
            onClick={() => {
              if (isSelected) onExpand(ev);
              else onSelect(ev);
            }}
            className={`shrink-0 w-[70vw] max-w-[280px] snap-center rounded-3xl overflow-hidden text-left bg-card/95 backdrop-blur-md border transition-all ${
              isSelected
                ? 'border-primary shadow-[0_8px_24px_hsl(var(--primary)/0.35)] scale-100'
                : 'border-border/50 shadow-md scale-95 opacity-90'
            }`}
          >
            <div className="relative h-32 bg-muted">
              {ev.image ? (
                <img src={ev.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
              {ev.is_featured && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[hsl(var(--blitz-pink))] text-white text-[10px] font-bold uppercase tracking-wide shadow">
                  Top
                </span>
              )}
              {ev.category && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-card/90 text-foreground text-[10px] font-semibold backdrop-blur">
                  {categoryLabels[ev.category] || ev.category}
                </span>
              )}
            </div>
            <div className="px-3 py-2.5 space-y-1">
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
