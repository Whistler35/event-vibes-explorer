import { useEffect } from "react";
import { Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MatchMomentProps {
  open: boolean;
  activity?: string | null;
  myName?: string | null;
  myAvatar?: string | null;
  otherName?: string | null;
  otherAvatar?: string | null;
  onOpenChat: () => void;
  onKeepSwiping: () => void;
}

const MatchMoment = ({
  open,
  activity,
  myName,
  myAvatar,
  otherName,
  otherAvatar,
  onOpenChat,
  onKeepSwiping,
}: MatchMomentProps) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[hsl(var(--blitz-forest))] text-white animate-in fade-in duration-200">
      {/* Background pulse */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-[hsl(var(--bolt))] blur-3xl opacity-20 animate-blitz-pulse" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60 font-black">
          Match
        </p>

        <h1 className="text-6xl font-black uppercase leading-none tracking-tight animate-blitz-headline">
          Bin dabei!
        </h1>

        {activity && (
          <p className="text-white/80 text-lg font-bold">
            <Zap className="inline w-5 h-5 mr-1 fill-[hsl(var(--bolt))] text-[hsl(var(--bolt))]" />
            {activity}
          </p>
        )}

        {/* Two avatars with bolt between */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <Avatar className="w-24 h-24 border-4 border-white shadow-2xl animate-blitz-slam-left">
            <AvatarImage src={myAvatar ?? undefined} />
            <AvatarFallback className="bg-white/10 text-white text-2xl font-black">
              {myName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>

          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-[hsl(var(--bolt))] blur-xl opacity-70 animate-blitz-pulse" />
            <Zap className="relative w-12 h-12 text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))] drop-shadow-[0_0_20px_hsl(var(--bolt))]" />
          </div>

          <Avatar className="w-24 h-24 border-4 border-white shadow-2xl animate-blitz-slam-right">
            <AvatarImage src={otherAvatar ?? undefined} />
            <AvatarFallback className="bg-white/10 text-white text-2xl font-black">
              {otherName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        <p className="text-white/70 text-sm">
          Du & <span className="font-bold text-white">{otherName ?? "jemand"}</span> seid gematcht.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <button
            onClick={onOpenChat}
            className="w-full py-4 rounded-full bg-white text-[hsl(var(--blitz-forest))] font-black uppercase tracking-wider text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition"
          >
            Chat öffnen
          </button>
          <button
            onClick={onKeepSwiping}
            className="w-full py-4 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase tracking-wider text-sm hover:bg-white/20 transition"
          >
            Weiter swipen
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchMoment;
