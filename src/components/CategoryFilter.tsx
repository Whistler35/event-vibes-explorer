import React, { useState, useRef, useEffect } from 'react';
import { Music, Dribbble, Palette, UtensilsCrossed, PartyPopper, TreePine, Users, Wrench, SlidersHorizontal, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import type { EventCategory } from '@/hooks/useSearchEvents';
import type { DateRange } from 'react-day-picker';

const CATEGORIES: { id: EventCategory; label: string; icon: React.ElementType }[] = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'sports', label: 'Sports', icon: Dribbble },
  { id: 'culture', label: 'Culture', icon: Palette },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'nightlife', label: 'Nightlife', icon: PartyPopper },
  { id: 'outdoor', label: 'Outdoor', icon: TreePine },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'workshop', label: 'Workshop', icon: Wrench },
];

interface CategoryFilterProps {
  selectedCategories: EventCategory[];
  onCategoriesChange: (categories: EventCategory[]) => void;
  selectedDateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategories, onCategoriesChange, selectedDateRange, onDateRangeChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasActiveFilter = selectedCategories.length > 0 || !!selectedDateRange?.from;

  const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;

  const filterLabel = (() => {
    const parts: string[] = [];
    if (selectedCategories.length === 1) {
      const cat = CATEGORIES.find(c => c.id === selectedCategories[0]);
      if (cat) parts.push(cat.label);
    } else if (selectedCategories.length > 1) {
      parts.push(`${selectedCategories.length} Categories`);
    }
    if (selectedDateRange?.from) {
      if (selectedDateRange.to && selectedDateRange.from.getTime() !== selectedDateRange.to.getTime()) {
        parts.push(`${fmt(selectedDateRange.from)} – ${fmt(selectedDateRange.to)}`);
      } else {
        parts.push(fmt(selectedDateRange.from));
      }
    }
    return parts.length > 0 ? parts.join(' · ') : 'Filter';
  })();

  const toggleCategory = (id: EventCategory) => {
    if (selectedCategories.includes(id)) {
      onCategoriesChange(selectedCategories.filter(c => c !== id));
    } else {
      onCategoriesChange([...selectedCategories, id]);
    }
  };

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
        <div className="absolute top-full right-0 mt-2 w-[18rem] max-w-[calc(100vw-1.5rem)] rounded-md border border-border bg-card shadow-lg z-[60] max-h-[70vh] flex flex-col">
          <div className="p-3 overflow-y-auto flex-1 min-h-0">
            {/* Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kategorie</p>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => onCategoriesChange([])}
                    className="text-xs text-primary hover:underline"
                  >
                    Alle abwählen
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(({ id, label, icon: Icon }) => {
                  const isActive = selectedCategories.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleCategory(id)}
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
              </div>
            )}
          </div>

          {/* Sticky action buttons */}
          {onDateRangeChange && (
            <div className="flex gap-2 p-3 pt-0 border-t border-border bg-card rounded-b-md">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => { onCategoriesChange([]); onDateRangeChange(undefined); }}
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
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
