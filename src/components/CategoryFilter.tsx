import React, { useState, useRef, useEffect } from 'react';
import { Music, Dribbble, Palette, UtensilsCrossed, PartyPopper, TreePine, Users, Wrench, SlidersHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import type { EventCategory } from '@/hooks/useSearchEvents';
import type { DateRange } from 'react-day-picker';

const CATEGORIES: { id: EventCategory | ''; label: string; icon: React.ElementType }[] = [
  { id: '', label: 'Alle', icon: SlidersHorizontal },
  { id: 'music', label: 'Musik', icon: Music },
  { id: 'sports', label: 'Sport', icon: Dribbble },
  { id: 'culture', label: 'Kultur', icon: Palette },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'nightlife', label: 'Nightlife', icon: PartyPopper },
  { id: 'outdoor', label: 'Outdoor', icon: TreePine },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'workshop', label: 'Workshop', icon: Wrench },
];

interface CategoryFilterProps {
  selected: EventCategory | '';
  onChange: (category: EventCategory | '') => void;
  selectedDateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange, selectedDateRange, onDateRangeChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeCategory = CATEGORIES.find(c => c.id === selected);
  const hasActiveFilter = selected !== '' || !!selectedDateRange?.from;

  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;

  const filterLabel = (() => {
    const parts: string[] = [];
    if (selected && activeCategory) parts.push(activeCategory.label);
    if (selectedDateRange?.from) {
      if (selectedDateRange.to && selectedDateRange.from.getTime() !== selectedDateRange.to.getTime()) {
        parts.push(`${fmt(selectedDateRange.from)} – ${fmt(selectedDateRange.to)}`);
      } else {
        parts.push(fmt(selectedDateRange.from));
      }
    }
    return parts.length > 0 ? parts.join(' · ') : 'Filter';
  })();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
          hasActiveFilter
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        {filterLabel}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-md border border-border bg-card shadow-lg z-50 max-h-[60vh] flex flex-col">
          <div className="p-3 overflow-y-auto flex-1 min-h-0">
          {/* Categories */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kategorie</p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(({ id, label, icon: Icon }) => {
                const isActive = selected === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onChange(id);
                      if (!onDateRangeChange) setOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range picker */}
          {onDateRangeChange && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  Datum
                </p>
                {selectedDateRange?.from && (
                  <button
                    onClick={() => onDateRangeChange(undefined)}
                    className="text-xs text-primary hover:underline"
                  >
                    Zurücksetzen
                  </button>
                )}
              </div>
              <Calendar
                mode="range"
                weekStartsOn={1}
                selected={selectedDateRange}
                onSelect={(range) => onDateRangeChange(range || undefined)}
                numberOfMonths={1}
                className={cn("p-0 pointer-events-auto")}
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => { onDateRangeChange(undefined); }}
                >
                  Löschen
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Übernehmen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
