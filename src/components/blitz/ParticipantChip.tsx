import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  name: string;
  avatarUrl: string | null;
  label: string;
  onTap: () => void;
  /** If provided, a ~500ms press-and-hold triggers this instead of onTap. */
  onLongPress?: () => void;
}

const LONG_PRESS_MS = 500;

/** A "who's in" chip supporting a normal tap and an optional long-press (host-only actions). */
const ParticipantChip = ({ name, avatarUrl, label, onTap, onLongPress }: Props) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);

  const start = () => {
    if (!onLongPress) return;
    firedLongPress.current = false;
    timerRef.current = setTimeout(() => {
      firedLongPress.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onClick={() => {
        if (firedLongPress.current) {
          firedLongPress.current = false;
          return;
        }
        onTap();
      }}
      className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white shadow-sm active:scale-[0.97] hover:bg-white/80 transition select-none"
    >
      <Avatar className="w-7 h-7">
        <AvatarImage src={avatarUrl ?? undefined} loading="lazy" />
        <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-black">
          {name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="leading-tight text-left">
        <p className="text-xs font-black">{name}</p>
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground truncate max-w-[110px]">
          {label}
        </p>
      </div>
    </button>
  );
};

export default ParticipantChip;
