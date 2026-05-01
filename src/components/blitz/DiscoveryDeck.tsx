import { useEffect, useRef, useState } from "react";
import { Zap, X, Check, MapPin, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBlitzDiscovery, swipeBlitz, DiscoveryBlitz } from "@/hooks/useBlitzDiscovery";
import { toast } from "sonner";

const SWIPE_THRESHOLD = 100;

interface CardProps {
  item: DiscoveryBlitz;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
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

const SwipeCard = ({ item, onSwipe, isTop }: CardProps) => {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const isDownRef = useRef(false);

  const handleStart = (clientX: number, clientY: number) => {
    if (!isTop || animating) return;
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

  return (
    <div
      className="absolute inset-0 select-none touch-none"
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`,
        transition: animating || !isDownRef.current ? "transform 0.25s ease-out" : "none",
        zIndex: isTop ? 10 : 1,
        cursor: isTop ? "grab" : "default",
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      <div className="relative w-full h-full overflow-hidden rounded-3xl bg-[hsl(var(--blitz-forest))] text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-30" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-25" />

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

        <div className="relative z-10 flex flex-col h-full p-8">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14 border-2 border-[hsl(var(--blitz-pink))]">
              <AvatarImage src={item.host_avatar ?? undefined} />
              <AvatarFallback className="bg-[hsl(var(--blitz-pink))] text-white font-black">
                {item.host_name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg leading-tight">{item.host_name ?? "Anonym"}</p>
              {item.city && (
                <p className="text-xs text-white/60 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {item.city}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <h2 className="text-6xl font-black uppercase leading-none tracking-tight break-words">
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
              Swipe → für Match
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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  const handleSwipe = async (dir: "left" | "right") => {
    const item = items[index];
    if (!item) return;
    try {
      await swipeBlitz(item.id, dir);
      if (dir === "right") {
        toast("⚡ Anfrage gesendet!", { description: `Du wartest auf ${item.host_name ?? "den Host"}.` });
      }
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Swipen");
    }
    setIndex((i) => i + 1);
  };

  if (!hasLocation && locError) {
    return (
      <div className="h-[calc(100vh-220px)] rounded-3xl bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center text-center p-8 gap-4">
        <MapPin className="w-16 h-16 text-[hsl(var(--blitz-pink))] opacity-60" />
        <h2 className="text-3xl font-black uppercase">Standort nötig</h2>
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

  const remaining = items.slice(index, index + 2);

  if (remaining.length === 0) {
    return (
      <div className="h-[calc(100vh-220px)] rounded-3xl bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center text-center p-8 gap-4">
        <Zap className="w-16 h-16 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] opacity-60" />
        <h2 className="text-3xl font-black uppercase">Keine Blitze</h2>
        <p className="text-white/70 max-w-xs">
          Aktuell läuft kein Blitz in deinem Umkreis. Komm später wieder oder starte selbst einen!
        </p>
        <button
          onClick={reload}
          className="mt-4 px-6 py-3 rounded-full bg-[hsl(var(--blitz-pink))] text-white font-bold uppercase text-sm tracking-wide"
        >
          Neu laden
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
              onSwipe={handleSwipe}
            />
          ))
          .reverse()}
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => handleSwipe("left")}
          className="w-16 h-16 rounded-full bg-white border-2 border-muted flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
          aria-label="Ignorieren"
        >
          <X className="w-7 h-7 text-muted-foreground" />
        </button>
        <button
          onClick={() => handleSwipe("right")}
          className="w-16 h-16 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--blitz-pink)/0.6)] hover:scale-110 active:scale-95 transition"
          aria-label="Anfrage senden"
        >
          <Check className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
};

export default DiscoveryDeck;
