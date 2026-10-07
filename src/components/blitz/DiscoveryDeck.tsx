import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Zap, X, Check, MapPin, Loader2, Trash2, Users, Share2, ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBlitzDiscovery, swipeBlitz, undoSwipe, DiscoveryBlitz } from "@/hooks/useBlitzDiscovery";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getActivityFontClass } from "@/lib/blitzText";
import { asBlitzQuestion } from "@/lib/utils";
import { toast } from "sonner";
import { shareInvite } from "@/lib/share";
import { PUBLIC_WEB_ORIGIN } from "@/lib/publicUrl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import FriendSearch from "@/components/FriendSearch";

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

const TAP_MOVE_LIMIT = 8;
const FACE_HIDDEN: React.CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

const SwipeCard = ({ item, onSwipe, onAdminDelete, isTop, isAdmin }: CardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // A Blitz with a picture can be flipped by tapping it (not by swiping).
  const [flipped, setFlipped] = useState(false);
  const hasImage = !!item.image_url;
  // `drag` only drives the release animation (snap-back / fly-out) — a single
  // React update per gesture, not per pixel. While a finger is actually
  // moving, position is written straight to the DOM via refs below, bypassing
  // React re-renders entirely so the card tracks the touch with no lag.
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const isDownRef = useRef(false);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const nopeRef = useRef<HTMLDivElement>(null);

  const isOnNoDrag = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest("[data-no-drag]");

  const applyTransform = (x: number, y: number) => {
    if (cardRef.current) {
      cardRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${x / 20}deg)`;
    }
    if (likeRef.current) likeRef.current.style.opacity = String(Math.max(0, Math.min(1, x / SWIPE_THRESHOLD)));
    if (nopeRef.current) nopeRef.current.style.opacity = String(Math.max(0, Math.min(1, -x / SWIPE_THRESHOLD)));
  };

  const handleStart = (clientX: number, clientY: number, target: EventTarget | null) => {
    if (!isTop || animating) return;
    if (isOnNoDrag(target)) return;
    isDownRef.current = true;
    dragPosRef.current = { x: 0, y: 0 };
    startRef.current = { x: clientX, y: clientY };
    if (cardRef.current) cardRef.current.style.transition = "none";
  };
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDownRef.current) return;
    const x = clientX - startRef.current.x;
    const y = clientY - startRef.current.y;
    dragPosRef.current = { x, y };
    applyTransform(x, y);
  };
  const handleEnd = (allowTap = true) => {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    const { x, y } = dragPosRef.current;
    if (cardRef.current) cardRef.current.style.transition = "transform 0.25s ease-out";
    // Barely moved = a tap, not a swipe → flip the card to show its picture.
    if (allowTap && hasImage && Math.hypot(x, y) < TAP_MOVE_LIMIT) {
      setFlipped((f) => !f);
    }
    if (Math.abs(x) > SWIPE_THRESHOLD) {
      const dir = x > 0 ? "right" : "left";
      const flyX = x > 0 ? 1000 : -1000;
      setAnimating(true);
      setDrag({ x: flyX, y });
      applyTransform(flyX, y);
      setTimeout(() => onSwipe(dir), 250);
    } else {
      setDrag({ x: 0, y: 0 });
      applyTransform(0, 0);
    }
  };

  const fontClass = getActivityFontClass(item.activity);

  const handleProfile = () => {
    // A Freifeld sender (e.g. a brand) has no profile of its own to open.
    if (item.host_id && !item.is_freifeld) navigate(`/user/${item.host_id}`);
  };

  const handleDelete = () => {
    if (!confirm(`Diesen Blitz wirklich löschen?\n\n„${item.activity}" von ${item.host_name ?? "Unbekannt"}`)) {
      return;
    }
    onAdminDelete(item.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    shareInvite({
      title: item.activity,
      text: `${item.host_name?.split(" ")[0] ?? "Jemand"} blitzt gerade: ${item.activity} – schau vorbei!`,
      url: `${PUBLIC_WEB_ORIGIN}/s/${item.id}`,
      copiedMessage: "Link kopiert",
    });
  };

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none touch-none"
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 20}deg)`,
        transition: animating || !isDownRef.current ? "transform 0.25s ease-out" : "none",
        zIndex: isTop ? 10 : 1,
        cursor: isTop ? "grab" : "default",
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.target)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={() => handleEnd()}
      onMouseLeave={() => handleEnd(false)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={() => handleEnd()}
    >
      <div className="w-full h-full" style={{ perspective: "1400px" }}>
      <div
        className="relative w-full h-full transition-transform duration-500 ease-out"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
      <div
        className="relative w-full h-full overflow-hidden rounded-[28px] bg-[hsl(var(--blitz-forest))] text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
        style={FACE_HIDDEN}
      >
        <TimeProgressBar expiresAt={item.expires_at} durationMinutes={item.duration_minutes} />

        {(item.audience === "friends" || item.audience === "selected") && (
          <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-[10px] font-black uppercase tracking-[0.15em]">
            <Users className="w-3 h-3" /> Freund
          </div>
        )}

        {/* Time-left pill top-right */}
        <div className="absolute top-5 right-5 z-20 inline-flex items-center px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-xs font-black tabular-nums">
          <Countdown expiresAt={item.expires_at} />
        </div>

        {/* Swipe overlays */}
        <div
          ref={likeRef}
          className="absolute top-24 left-6 z-20 px-4 py-2 rounded-2xl border-4 border-[hsl(var(--bolt))] text-[hsl(var(--bolt))] font-black text-3xl uppercase rotate-[-15deg]"
          style={{ opacity: Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD)) }}
        >
          Match!
        </div>
        <div
          ref={nopeRef}
          className="absolute top-24 right-6 z-20 px-4 py-2 rounded-2xl border-4 border-white/70 text-white/70 font-black text-3xl uppercase rotate-[15deg]"
          style={{ opacity: Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD)) }}
        >
          Nope
        </div>

        {isAdmin && isTop && (
          <button
            data-no-drag
            onClick={handleDelete}
            aria-label="Blitz als Admin löschen"
            className="absolute bottom-5 right-5 z-30 w-9 h-9 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 transition"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}

        {isTop && (
          <button
            data-no-drag
            onClick={handleShare}
            aria-label="Blitz teilen"
            className="absolute bottom-5 left-5 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 transition"
          >
            <Share2 className="w-4 h-4 text-white/85" />
          </button>
        )}

        <div className="relative z-10 flex flex-col h-full pt-20 pb-8 px-8 items-center text-center">
          {/* Big activity tile */}
          <div className="shrink-0 w-32 h-32 rounded-3xl bg-[hsl(var(--blitz-forest-deep))]/60 flex items-center justify-center mb-8">
            <Zap className="w-16 h-16 text-[hsl(var(--bolt))]" strokeWidth={2} />
          </div>

          {/* Flexible + scrollable so however long the text is, the host row
              below never gets pushed off-screen or clipped. fontClass already
              scales the size down for longer text (see getActivityFontClass);
              this is the safety net for the extreme cases. */}
          <div className="flex-1 min-h-0 min-w-0 w-full flex items-center justify-center overflow-x-hidden overflow-y-auto">
            {/* w-full (not just max-w-full) gives this a definite width to
                wrap against — a shrink-to-fit box sizes to its longest
                unbreakable run BEFORE break-words can kick in, which is how
                a single very long "word" (no spaces) still overflowed the
                card sideways. break-all is the hard backstop for that case. */}
            <h2 className={`${fontClass} font-black leading-[0.95] tracking-tight break-words [overflow-wrap:anywhere] break-all w-full`}>
              {asBlitzQuestion(item.activity)}
            </h2>
          </div>

          {item.friends_in.length > 0 && (
            <div className="shrink-0 mt-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))]/15 border border-[hsl(var(--bolt))]/30 max-w-full">
              <div className="flex -space-x-2 shrink-0">
                {item.friends_in.slice(0, 3).map((f) => (
                  <Avatar key={f.user_id} className="w-6 h-6 border-2 border-[hsl(var(--blitz-forest))]">
                    <AvatarImage src={f.avatar_url ?? undefined} loading="lazy" />
                    <AvatarFallback className="bg-[hsl(var(--blitz-forest-deep))] text-white text-[9px] font-black">
                      {f.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs font-bold text-[hsl(var(--bolt))] truncate">
                {t("blitz.friendsIn", {
                  count: item.friends_in.length,
                  name: item.friends_in[0].name?.split(" ")[0] ?? "",
                })}
              </span>
            </div>
          )}

          <button
            type="button"
            data-no-drag
            onClick={handleProfile}
            className="shrink-0 mt-5 flex items-center gap-2 text-white/85"
            aria-label={`Profil von ${item.host_name ?? "Host"} öffnen`}
          >
            <Avatar className="w-8 h-8 border border-white/20">
              <AvatarImage src={item.host_avatar ?? undefined} loading="lazy" />
              <AvatarFallback className="bg-[hsl(var(--blitz-forest-deep))] text-white text-[10px] font-black">
                {item.host_name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm">
              <span className="font-black">{item.host_name?.split(" ")[0] ?? "Anonymous"}</span>{" "}
              <span className="text-white/60">is hosting</span>
            </p>
          </button>

          {item.city && (
            <p className="shrink-0 mt-2 text-white/60 text-sm">{item.city}</p>
          )}
        </div>

        {hasImage && isTop && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-[11px] font-bold whitespace-nowrap pointer-events-none">
            <ImageIcon className="w-3.5 h-3.5" /> {t("blitz.tapForPhoto")}
          </div>
        )}
      </div>

      {/* Back of the card: the Blitz's picture */}
      {hasImage && (
        <div
          className="absolute inset-0 overflow-hidden rounded-[28px] bg-[hsl(var(--blitz-forest))] text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
          style={{ ...FACE_HIDDEN, transform: "rotateY(180deg)" }}
        >
          <img
            src={item.image_url ?? undefined}
            alt={item.activity}
            loading="lazy"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-center pointer-events-none">
            <p className="text-lg font-black leading-tight break-words [overflow-wrap:anywhere]">{item.activity}</p>
            <p className="mt-2 text-white/70 text-[11px] font-bold uppercase tracking-widest">
              {t("blitz.tapToFlipBack")}
            </p>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
};


interface DiscoveryDeckProps {
  city?: string | null;
  onStartOwn?: () => void;
}

const DiscoveryDeck = ({ city, onStartOwn }: DiscoveryDeckProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, loading, reload, locError, hasLocation } = useBlitzDiscovery(city);
  const { isAdmin } = useIsAdmin();
  const [index, setIndex] = useState(0);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showFriendSearch, setShowFriendSearch] = useState(false);

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
      const { swipeId, matched, matchId } = await swipeBlitz(item.id, dir);
      if (dir === "right" && matched && matchId) {
        toast("⚡ MATCH!", { description: "Ihr seid befreundet – du bist direkt im Huddle." });
        navigate(`/blitz/match/${matchId}`);
        return;
      }
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
      <div className="h-full min-h-[380px] rounded-3xl bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center text-center p-8 gap-4">
        <MapPin className="w-16 h-16 text-[hsl(var(--blitz-pink))] opacity-60" />
        <h2 className="text-3xl font-black uppercase">Location required</h2>
        <p className="text-white/70 max-w-xs">{locError}</p>
      </div>
    );
  }

  if (loading || !hasLocation) {
    return (
      <div className="h-full min-h-[380px] rounded-3xl bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const remaining = visibleItems.slice(index, index + 2);

  if (remaining.length === 0) {
    return (
      // min-h (not h): on small/high-DPI phones this card is taller than the
      // scroll area, and a fixed height made the title and buttons spill out
      // past both ends where they were clipped and couldn't be scrolled to.
      <div className="min-h-[max(100%,380px)] rounded-3xl bg-[hsl(var(--blitz-forest))] text-white flex flex-col items-center justify-center text-center px-8 py-10 gap-4">
        <Zap className="w-16 h-16 shrink-0 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] opacity-60" />
        <h2 className="text-3xl font-black uppercase">{t("blitz.noBlitzesTitle")}</h2>
        <p className="text-white/70 max-w-xs">
          Aktuell ist hier in der Nähe nichts los. Sei der Erste und starte deinen eigenen Blitz — oder hol dir
          mehr Leute in deine Gegend.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
          {onStartOwn && (
            <button
              onClick={onStartOwn}
              className="px-6 py-3 rounded-full bg-[hsl(var(--blitz-pink))] text-white font-black uppercase text-sm tracking-wide flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition"
            >
              <Zap className="w-4 h-4 fill-white" /> Starte deinen eigenen
            </button>
          )}
          <button
            onClick={() =>
              shareInvite({
                title: "EVENDLE",
                text: "Komm auf EVENDLE, dann ist hier mehr los!",
                url: `${PUBLIC_WEB_ORIGIN}/`,
                copiedMessage: "Einladungslink kopiert",
              })
            }
            className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-white/20 transition"
          >
            <Users className="w-4 h-4" /> Freunde einladen
          </button>
          <button
            onClick={() => setShowFriendSearch(true)}
            className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-bold uppercase text-sm tracking-wide hover:bg-white/20 transition"
          >
            Freunde auf EVENDLE finden
          </button>
          <button
            onClick={reload}
            className="px-6 py-3 rounded-full text-white/60 font-bold uppercase text-xs tracking-wide hover:text-white transition"
          >
            Neu laden
          </button>
        </div>

        <Sheet open={showFriendSearch} onOpenChange={setShowFriendSearch}>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>Freunde finden</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <FriendSearch />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative h-full min-h-[440px]">
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
          className="w-16 h-16 rounded-full bg-[hsl(var(--bolt))] flex items-center justify-center shadow-[0_10px_28px_-8px_hsl(var(--bolt)/0.7)] hover:scale-110 active:scale-95 transition"
          aria-label="Send request"
        >
          <Check className="w-7 h-7 text-[hsl(var(--blitz-forest))]" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default DiscoveryDeck;
