import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, X, Check, MapPin, Loader2, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBlitzDiscovery, swipeBlitz, undoSwipe, DiscoveryBlitz } from "@/hooks/useBlitzDiscovery";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getActivityFontClass } from "@/lib/blitzText";
import { toast } from "sonner";

const SWIPE_THRESHOLD = 100;

interface CardProps {
  item: DiscoveryBlitz;
  onSwipe: (dir: "left" | "right") => void;
  onAdminDelete: (id: string) => void;
  isTop: boolean;
  isAdmin: boolean;
}

const Countdown = ({ expiresAt }: { expiresAt: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
};

const TimeProgressBar = ({
  expiresAt,
  durationMinutes,
}: {
  expiresAt: string;
  durationMinutes: number;
}) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const totalMs = Math.max(1, durationMinutes * 60_000);
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const pct = Math.min(100, Math.max(0, (remaining / totalMs) * 100));
  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
      <div
        className="h-full bg-[hsl(var(--blitz-pink))] transition-[width] duration-1000 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const SwipeCard = ({ item, onSwipe, onAdminDelete, isTop, isAdmin }: CardProps) => {
  const navigate = useNavigate();
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const isDownRef = useRef(false);

  const isOnNoDrag = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest("[data-no-drag]");

  const handleStart = (clientX: number, clientY: number, target: EventTarget | null) => {
    if (!isTop || animating) return;
    if (isOnNoDrag(target)) return;
    isDownRef.current = true;
    startRef.current = { x: clientX, y: clientY };
  };
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDownRef.current) return;
    setDrag({ x: clientX - startRef.current.x, y: clientY - startRef.current.y });
  };
  const handleEnd = () => {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    if (Math.abs(drag.x) > SWIPE_THRESHOLD) {
      const dir = drag.x > 0 ? "right" : "left";
      setAnimating(true);
      setDrag({ x: drag.x > 0 ? 1000 : -1000, y: drag.y });
      setTimeout(() => onSwipe(dir), 250);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  };

  const rotate = drag.x / 20;
  const likeOpacity = Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD));
  const fontClass = getActivityFontClass(item.activity);

  const handleProfile = () => {
    if (item.host_id) navigate(`/user/${item.host_id}`);
  };

  const handleDelete = () => {
    if (!confirm(`Diesen Blitz wirklich löschen?\n\n„${item.activity}" von ${item.host_name ?? "Unbekannt"}`)) {
      return;
    }
    onAdminDelete(item.id);
  };

  return (
    <div
      className="absolute inset-0 select-none touch-none"
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`,
        transition: animating || !isDownRef.current ? "transform 0.25s ease-out" : "none",
        zIndex: isTop ? 10 : 1,
        cursor: isTop ? "grab" : "default",
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.target)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      <div className="relative w-full h-full overflow-hidden rounded-3xl bg-[hsl(var(--blitz-forest))] text-white shadow-2xl">
        <TimeProgressBar expiresAt={item.expires_at} durationMinutes={item.duration_minutes} />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-30" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-25" />

        {(item.audience === "friends" || item.audience === "selected") && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(var(--blitz-pink))]/90 text-white text-[10px] font-black uppercase tracking-wider">
            <Users className="w-3 h-3" /> Freund
          </div>
        )}


        <div
          className="absolute top-8 left-8 z-20 px-4 py-2 rounded-xl border-4 border-[hsl(var(--blitz-pink))] text-[hsl(var(--blitz-pink))] font-black text-3xl uppercase rotate-[-15deg]"
          style={{ opacity: likeOpacity }}
        >
          Match!
        </div>
        <div
          className="absolute top-8 right-8 z-20 px-4 py-2 rounded-xl border-4 border-white/70 text-white/70 font-black text-3xl uppercase rotate-[15deg]"
          style={{ opacity: nopeOpacity }}
        >
          Nope
        </div>

        {isAdmin && isTop && (
          <button
            data-no-drag
            onClick={handleDelete}
            aria-label="Blitz als Admin löschen"
            className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 transition"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}

        <div className="relative z-10 flex flex-col h-full p-8">
          <button
            type="button"
            data-no-drag
            onClick={handleProfile}
            className="flex items-center gap-3 text-left rounded-xl -mx-2 -my-1 px-2 py-1 hover:bg-white/5 active:bg-white/10 transition"
            aria-label={`Profil von ${item.host_name ?? "Host"} öffnen`}
          >
            <Avatar className="w-14 h-14 border-2 border-[hsl(var(--blitz-pink))]">
              <AvatarImage src={item.host_avatar ?? undefined} />
              <AvatarFallback className="bg-[hsl(var(--blitz-pink))] text-white font-black">
                {item.host_name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg leading-tight underline decoration-[hsl(var(--blitz-pink))]/40 underline-offset-4">
                {item.host_name ?? "Anonymous"}
              </p>
              <p className="text-xs text-white/60 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {item.distance_km < 1
                  ? `${Math.round(item.distance_km * 1000)} m`
                  : `${item.distance_km.toFixed(1)} km`} away
              </p>
            </div>
          </button>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 min-h-0">
            <h2 className={`${fontClass} font-black uppercase leading-tight tracking-tight break-words max-w-full`}>
              {item.activity}?
            </h2>
            <div className="space-y-1">
              <div className="text-5xl font-black tabular-nums text-[hsl(var(--blitz-pink))] drop-shadow-[0_0_20px_hsl(var(--blitz-pink)/0.6)]">
                <Countdown expiresAt={item.expires_at} />
              </div>
              <p className="text-xs uppercase tracking-widest text-white/60 font-bold">left</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            <Zap className="w-5 h-5 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))]" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">
              Swipe → for Match
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DiscoveryDeckProps {
  city?: string | null;
}

const DiscoveryDeck = ({ city }: DiscoveryDeckProps) => {
  const { items, loading, reload, locError, hasLocation } = useBlitzDiscovery(city);
  const { isAdmin } = useIsAdmin();
  const [index, setIndex] = useState(0);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIndex(0);
    setRemovedIds(new Set());
  }, [items.length]);

  const visibleItems = items.filter((it) => !removedIds.has(it.id));

  const handleSwipe = async (dir: "left" | "right") => {
    const item = visibleItems[index];
    if (!item) return;
    setIndex((i) => i + 1);
    try {
      const swipeId = await swipeBlitz(item.id, dir);
      if (dir === "right") {
        toast("⚡ Anfrage gesendet!", {
          description: `Wartet auf ${item.host_name ?? "den Host"}.`,
          action: swipeId
            ? {
                label: "Rückgängig",
                onClick: async () => {
                  try {
                    await undoSwipe(swipeId);
                    toast("Swipe rückgängig gemacht");
                    reload();
                  } catch (e: any) {
                    toast.error(e.message || "Konnte nicht rückgängig gemacht werden");
                  }
                },
              }
            : undefined,
        });
      } else {
        toast("Übersprungen", {
          description: item.activity,
          action: swipeId
            ? {
                label: "Rückgängig",
                onClick: async () => {
                  try {
                    await undoSwipe(swipeId);
                    toast("Blitz wieder im Stapel");
                    reload();
                  } catch (e: any) {
                    toast.error(e.message || "Konnte nicht rückgängig gemacht werden");
                  }
                },
              }
            : undefined,
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Swipe fehlgeschlagen");
    }
  };

  const handleAdminDelete = async (id: string) => {
    const { error } = await supabase.from("blitz_requests").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Löschen fehlgeschlagen");
      return;
    }
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    toast.success("Blitz gelöscht");
  };

  if (!hasLocation && locError) {
    return (
      <div className="h-[calc(100vh-220px)] rounded-3xl bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center text-center p-8 gap-4">
        <MapPin className="w-16 h-16 text-[hsl(var(--blitz-pink))] opacity-60" />
        <h2 className="text-3xl font-black uppercase">Location required</h2>
        <p className="text-white/70 max-w-xs">{locError}</p>
      </div>
    );
  }

  if (loading || !hasLocation) {
    return (
      <div className="h-[calc(100vh-220px)] rounded-3xl bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const remaining = visibleItems.slice(index, index + 2);

  if (remaining.length === 0) {
    return (
      <div className="h-[calc(100vh-220px)] rounded-3xl bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center text-center p-8 gap-4">
        <Zap className="w-16 h-16 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] opacity-60" />
        <h2 className="text-3xl font-black uppercase">No Blitzes</h2>
        <p className="text-white/70 max-w-xs">
          No active Blitz around you right now. Come back later or start your own!
        </p>
        <button
          onClick={reload}
          className="mt-4 px-6 py-3 rounded-full bg-[hsl(var(--blitz-pink))] text-white font-bold uppercase text-sm tracking-wide"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-[calc(100vh-280px)] min-h-[500px]">
        {remaining
          .map((item, i) => (
            <SwipeCard
              key={item.id}
              item={item}
              isTop={i === 0}
              isAdmin={isAdmin}
              onSwipe={handleSwipe}
              onAdminDelete={handleAdminDelete}
            />
          ))
          .reverse()}
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => handleSwipe("left")}
          className="w-16 h-16 rounded-full bg-white border-2 border-muted flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
          aria-label="Skip"
        >
          <X className="w-7 h-7 text-muted-foreground" />
        </button>
        <button
          onClick={() => handleSwipe("right")}
          className="w-16 h-16 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--blitz-pink)/0.6)] hover:scale-110 active:scale-95 transition"
          aria-label="Send request"
        >
          <Check className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
};

export default DiscoveryDeck;
