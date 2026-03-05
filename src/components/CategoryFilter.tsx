import React from 'react';
import { Music, Dribbble, Palette, UtensilsCrossed, PartyPopper, TreePine, Users, Wrench, LayoutGrid } from 'lucide-react';
import type { EventCategory } from '@/hooks/useSearchEvents';

const CATEGORIES: { id: EventCategory | ''; label: string; icon: React.ElementType }[] = [
  { id: '', label: 'Alle', icon: LayoutGrid },
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
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selected, onChange }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map(({ id, label, icon: Icon }) => {
        const isActive = selected === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default CategoryFilter;
