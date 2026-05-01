import { Plus } from "lucide-react";

interface Props {
  interests: string[];
  onEdit?: () => void;
}

const PALETTE = [
  "bg-emerald-600",
  "bg-purple-600",
  "bg-[hsl(var(--blitz-pink))]",
  "bg-blue-600",
  "bg-orange-500",
  "bg-teal-600",
  "bg-rose-600",
  "bg-indigo-600",
];

const colorFor = (label: string) => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const InterestChips = ({ interests, onEdit }: Props) => {
  if (!interests || interests.length === 0) {
    return (
      <button
        onClick={onEdit}
        className="chip-tag bg-white/10 border border-white/20 text-white/80"
      >
        <Plus className="w-3.5 h-3.5" /> Interessen hinzufügen
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {interests.map((tag) => (
        <span key={tag} className={`chip-tag ${colorFor(tag)}`}>
          {tag}
        </span>
      ))}
      {onEdit && (
        <button
          onClick={onEdit}
          className="chip-tag bg-white/10 border border-white/20 text-white/80"
          aria-label="Edit interests"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default InterestChips;
