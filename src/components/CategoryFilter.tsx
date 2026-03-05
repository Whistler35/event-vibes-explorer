import React, { useState } from 'react';
import { Music, Dribbble, Palette, UtensilsCrossed, PartyPopper, TreePine, Users, Wrench, SlidersHorizontal, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { EventCategory } from '@/hooks/useSearchEvents';

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
  selectedDate?: Date;
  onDateChange?: (date: Date | undefined) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange, selectedDate, onDateChange }) => {
  const [open, setOpen] = useState(false);

  const activeCategory = CATEGORIES.find(c => c.id === selected);
  const hasActiveFilter = selected !== '' || !!selectedDate;

  const filterLabel = (() => {
    const parts: string[] = [];
    if (selected && activeCategory) parts.push(activeCategory.label);
    if (selectedDate) {
      const d = selectedDate;
      parts.push(`${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'Filter';
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
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
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-card border-border" align="start" sideOffset={8}>
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
                    if (!onDateChange) setOpen(false);
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

        {/* Date picker */}
        {onDateChange && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Datum
              </p>
              {selectedDate && (
                <button
                  onClick={() => onDateChange(undefined)}
                  className="text-xs text-primary hover:underline"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => onDateChange(date)}
              className={cn("p-2 pointer-events-auto")}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CategoryFilter;
