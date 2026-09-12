import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, MapPin, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getActivityFontClass } from "@/lib/blitzText";
import { asBlitzQuestion } from "@/lib/utils";
import { withdrawSwipe, PendingSwipe } from "@/hooks/useMyPendingSwipes";
import { toast } from "sonner";

const Countdown = ({ target }: { target: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(target).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
};

interface Props {
  swipe: PendingSwipe | null;
  onOpenChange: (open: boolean) => void;
  onWithdrawn: () => void;
}

const PendingSwipeDetailSheet = ({ swipe, onOpenChange, onWithdrawn }: Props) => {
  const navigate = useNavigate();
  const [withdrawing, setWithdrawing] = useState(false);

  if (!swipe) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent />
      </Sheet>
    );
  }

  const fontClass = getActivityFontClass(swipe.activity);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await withdrawSwipe(swipe.swipe_id);
      toast("Anfrage zurückgezogen");
      onWithdrawn();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Sheet open={!!swipe} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 border-0 bg-transparent max-h-[90vh] overflow-y-auto"
      >
        <div className="relative overflow-hidden rounded-t-3xl bg-[hsl(var(--blitz-forest))] text-white shadow-2xl">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-30 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-25 pointer-events-none" />

          <div className="relative z-10 flex flex-col p-8 gap-6">
            <button
              type="button"
              onClick={() => swipe.host_id && navigate(`/user/${swipe.host_id}`)}
              className="flex items-center gap-3 text-left rounded-xl -mx-2 -my-1 px-2 py-1 hover:bg-white/5 active:bg-white/10 transition"
            >
              <Avatar className="w-14 h-14 border-2 border-[hsl(var(--blitz-pink))]">
                <AvatarImage src={swipe.host_avatar ?? undefined} />
                <AvatarFallback className="bg-[hsl(var(--blitz-pink))] text-white font-black">
                  {swipe.host_name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-lg leading-tight underline decoration-[hsl(var(--blitz-pink))]/40 underline-offset-4">
                  {swipe.host_name ?? "Anonymous"}
                </p>
                <p className="text-xs text-white/60 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Profil ansehen
                </p>
              </div>
            </button>

            <div className="flex flex-col items-center justify-center text-center space-y-5 py-6">
              <h2 className={`${fontClass} font-black uppercase leading-tight tracking-tight break-words max-w-full`}>
                {asBlitzQuestion(swipe.activity)}
              </h2>
              <div className="space-y-1">
                <div className="text-5xl font-black tabular-nums text-[hsl(var(--blitz-pink))] drop-shadow-[0_0_20px_hsl(var(--blitz-pink)/0.6)]">
                  <Countdown target={swipe.expires_at} />
                </div>
                <p className="text-xs uppercase tracking-widest text-white/60 font-bold">
                  verbleibend
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
                <Zap className="w-4 h-4 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))]" />
                <span className="text-xs uppercase tracking-[0.25em] font-bold">
                  Wartet auf Antwort…
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Anfrage zurückziehen
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full text-white/80 hover:text-white hover:bg-white/10"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PendingSwipeDetailSheet;
