import { useEffect } from "react";
import { Check } from "lucide-react";

interface Props {
  eventTitle: string;
  eventDate: string;
  onDone: () => void;
}

const EventJoinedConfirmation = ({ eventTitle, eventDate, onDone }: Props) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);

  const formattedDate = new Date(eventDate).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/95 backdrop-blur-sm animate-fade-in cursor-pointer"
      style={{ animationDuration: '180ms' }}
    >
      <div className="relative flex flex-col items-center justify-center px-8 text-center">
        {/* Shockwave rings */}
        <div className="absolute w-40 h-40 rounded-full border-2 border-citrus joined-shockwave" style={{ animationDelay: '0ms' }} />
        <div className="absolute w-40 h-40 rounded-full border-2 border-citrus joined-shockwave" style={{ animationDelay: '220ms' }} />

        {/* Check icon */}
        <div className="relative z-10 w-28 h-28 rounded-full bg-citrus flex items-center justify-center joined-check-pop shadow-2xl">
          <Check className="w-16 h-16 text-primary stroke-[3]" />
        </div>

        <h2 className="relative z-10 mt-8 text-4xl font-black text-white tracking-tight">
          Du bist dabei!
        </h2>
        <p className="relative z-10 mt-3 text-lg font-semibold text-citrus">
          {eventTitle}
        </p>
        <p className="relative z-10 mt-1 text-sm text-white/80">
          {formattedDate}
        </p>
        <p className="relative z-10 mt-8 text-sm text-white/70 flex items-center gap-2">
          <span>💬</span> Gruppenchat ist freigeschaltet
        </p>
      </div>
    </div>
  );
};

export default EventJoinedConfirmation;
