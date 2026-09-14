import { Hourglass, Zap, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyPendingSwipes, withdrawSwipe, PendingSwipe } from "@/hooks/useMyPendingSwipes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PendingSwipeDetailSheet from "./PendingSwipeDetailSheet";

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

const MyPendingSwipesList = () => {
  const { items, reload } = useMyPendingSwipes();
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [selected, setSelected] = useState<PendingSwipe | null>(null);

  const handleWithdraw = async (swipeId: string) => {
    setWithdrawing(swipeId);
    try {
      await withdrawSwipe(swipeId);
      toast("Anfrage zurückgezogen");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    } finally {
      setWithdrawing(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[hsl(var(--blitz-forest))]/5 border border-[hsl(var(--blitz-forest))]/20 p-3 space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Hourglass className="w-3.5 h-3.5 text-[hsl(var(--blitz-pink))]" />
        <p className="text-[10px] uppercase tracking-[0.25em] font-black text-[hsl(var(--blitz-forest))]">
          Your Requests
        </p>
      </div>
      {items.map((s) => (
        <button
          key={s.swipe_id}
          type="button"
          onClick={() => setSelected(s)}
          className="w-full flex items-center gap-3 p-2 rounded-xl bg-card hover:bg-muted/60 active:scale-[0.99] transition text-left"
        >
          <Avatar className="w-9 h-9 border border-[hsl(var(--blitz-pink))]/40">
            <AvatarImage src={s.host_avatar ?? undefined} loading="lazy" />
            <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-xs font-black">
              {s.host_name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-foreground">
              {s.host_name ?? "Anonymous"} · {s.activity}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))]" />
              waiting for response…
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-black tabular-nums text-[hsl(var(--blitz-pink))]">
              <Countdown target={s.expires_at} />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWithdraw(s.swipe_id);
              }}
              disabled={withdrawing === s.swipe_id}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Anfrage zurückziehen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </button>
      ))}

      <PendingSwipeDetailSheet
        swipe={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onWithdrawn={reload}
      />
    </div>
  );
};

export default MyPendingSwipesList;
