import { useEffect, useState } from "react";
import { Zap, X } from "lucide-react";
import { BlitzRequest, cancelBlitzRequest } from "@/hooks/useBlitzRequest";
import { getActivityFontClass } from "@/lib/blitzText";
import { toast } from "sonner";

interface ActiveBlitzScreenProps {
  request: BlitzRequest;
  onEnded: () => void;
}

const ActiveBlitzScreen = ({ request, onEnded }: ActiveBlitzScreenProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresAt = new Date(request.expires_at).getTime();
  const remainingMs = Math.max(0, expiresAt - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  useEffect(() => {
    if (remainingMs === 0) {
      toast("⚡ Your Blitz expired");
      onEnded();
    }
  }, [remainingMs, onEnded]);

  const handleCancel = async () => {
    try {
      await cancelBlitzRequest(request.id);
      toast("Blitz cancelled");
      onEnded();
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  };

  return (
    <div className="relative h-[calc(100dvh-220px)] sm:h-[calc(100dvh-240px)] md:h-[calc(100dvh-260px)] min-h-[380px] sm:min-h-[420px] md:min-h-[440px] max-h-[560px] sm:max-h-[620px] md:max-h-[680px] overflow-hidden rounded-3xl bg-[hsl(var(--blitz-forest))] text-white">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl" />
        <div className="absolute bottom-10 -right-10 w-80 h-80 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-70" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-[hsl(var(--blitz-pink))] blur-2xl" />
      </div>

      <Zap className="absolute top-8 right-6 w-7 h-7 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] opacity-60 animate-pulse" />
      <Zap className="absolute bottom-20 left-5 w-5 h-5 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] opacity-40 animate-pulse" style={{ animationDelay: "0.5s" }} />

      <div className="relative z-10 flex flex-col items-center justify-between h-full px-4 sm:px-6 py-4 sm:py-6 text-center">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">Live Blitz</p>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))]" />
            <span className="text-sm font-bold text-[hsl(var(--blitz-pink))] uppercase tracking-widest">Active</span>
          </div>
        </div>

        <div className="space-y-3 my-auto">
          <h1 className={`${getActivityFontClass(request.activity)} font-black uppercase leading-tight tracking-tight break-words max-w-full px-2`}>
            {request.activity}?
          </h1>

          <div className="flex items-baseline justify-center gap-2">
            <div className="text-5xl font-black tabular-nums text-[hsl(var(--blitz-pink))] drop-shadow-[0_0_20px_hsl(var(--blitz-pink)/0.6)] leading-none">
              {timeLabel}
            </div>
            <p className="text-xs uppercase tracking-widest text-white/60 font-bold">left</p>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            {request.city && (
              <p className="text-sm text-white/70 font-medium">📍 {request.city}</p>
            )}
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
              Radius {request.radius_km} km
            </p>
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-bold text-sm uppercase tracking-wide transition"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ActiveBlitzScreen;
