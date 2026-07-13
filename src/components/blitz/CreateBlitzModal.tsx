import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Zap, MapPin, Loader2, Globe2, Users, UserCheck, Check } from "lucide-react";
import { createBlitzRequest, BlitzAudience } from "@/hooks/useBlitzRequest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreateBlitzModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
];

const RADIUS_MIN = 1;
const RADIUS_MAX = 50;
const RADIUS_STEP = 5;

const CreateBlitzModal = ({ open, onOpenChange, onCreated }: CreateBlitzModalProps) => {
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState(60);
  const [radius, setRadius] = useState(10);
  const [audience, setAudience] = useState<BlitzAudience>("public");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const { user } = useAuth();

  const { data: friends = [] } = useQuery({
    queryKey: ["blitz-friend-picker", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      if (!user) return [];
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      const ids = (fs || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      return (profiles || []) as { user_id: string; name: string; avatar_url: string | null }[];
    },
  });

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocError("Location is not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? "Location access required to Blitz."
            : "Could not determine your location."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (open && !coords) requestLocation();
    if (!open) {
      // reset on close
      setActivity("");
      setDuration(60);
      setRadius(10);
      setAudience("public");
      setSelectedFriendIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!activity.trim()) {
      toast.error("Sag uns, worauf du Bock hast!");
      return;
    }
    if (!coords) {
      toast.error("Standort erforderlich.");
      return;
    }
    if (audience === "selected" && selectedFriendIds.length === 0) {
      toast.error("Wähl mindestens einen Freund aus.");
      return;
    }
    setSubmitting(true);
    try {
      const city =
        localStorage.getItem("evendle.selectedCity") ||
        localStorage.getItem("evendle_selected_city") ||
        null;
      await createBlitzRequest({
        activity,
        durationMinutes: duration,
        city,
        latitude: coords.lat,
        longitude: coords.lng,
        radiusKm: radius,
        audience,
        targetUserIds: audience === "selected" ? selectedFriendIds : undefined,
      });
      toast.success(
        audience === "selected"
          ? `⚡ Geblitzt an ${selectedFriendIds.length} Freund${selectedFriendIds.length === 1 ? "" : "e"}`
          : audience === "friends"
          ? "⚡ Geblitzt! (nur Freunde)"
          : "⚡ Geblitzt!"
      );
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Konnte nicht erstellt werden");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !submitting &&
    !!activity.trim() &&
    !!coords &&
    (audience !== "selected" || selectedFriendIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-md p-0 border-0 bg-[hsl(var(--blitz-forest))] text-white max-h-[92dvh] overflow-hidden rounded-[28px] relative [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:z-10"
      >
        <VisuallyHidden>
          <DialogTitle>Spontaneous Blitz Request</DialogTitle>
          <DialogDescription>Create a spontaneous Blitz request</DialogDescription>
        </VisuallyHidden>
        <div className="max-h-[92dvh] overflow-y-auto overscroll-contain">
        <div className="px-5 pt-8 pb-32 space-y-5 min-w-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-[hsl(var(--blitz-forest-deep))]/60 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/55 font-black">Blitz</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight truncate">
                Spontaneous Request
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">
              What are you up for?
            </label>
            <input
              autoFocus
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. Tennis, Coffee…"
              maxLength={80}
              className="block w-full min-w-0 max-w-full bg-transparent border-b border-white/25 focus:border-[hsl(var(--bolt))] outline-none text-base sm:text-lg font-black placeholder:text-white/25 py-3 transition truncate"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">
              How long?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => {
                const active = duration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`py-4 rounded-2xl font-black text-lg transition border-2 ${
                      active
                        ? "bg-[hsl(var(--bolt))]/10 border-[hsl(var(--bolt))] text-[hsl(var(--bolt))]"
                        : "bg-white/5 border-white/10 text-white/80"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">
              Radius
            </label>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={RADIUS_STEP}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-[hsl(var(--bolt))] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] uppercase tracking-widest font-black">
              <span className="text-white/40">{RADIUS_MIN} KM</span>
              <span className="text-[hsl(var(--bolt))]">{radius} KM</span>
              <span className="text-white/40">{RADIUS_MAX} KM</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">
              Sichtbarkeit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "public", label: "Öffentlich", Icon: Globe2 },
                { value: "friends", label: "Freunde", Icon: Users },
                { value: "selected", label: "Auswählen", Icon: UserCheck },
              ] as const).map(({ value, label, Icon }) => {
                const active = audience === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAudience(value)}
                    className={`p-3 rounded-2xl text-center transition border-2 ${
                      active
                        ? "bg-[hsl(var(--bolt))]/10 border-[hsl(var(--bolt))] text-[hsl(var(--bolt))]"
                        : "bg-white/5 border-white/10 text-white/80"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <Icon className="w-5 h-5" />
                      <span className="font-black text-[11px] uppercase tracking-wide">{label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {audience === "selected" && (
              <div className="mt-2 rounded-2xl bg-white/5 border border-white/10 p-2 max-h-56 overflow-y-auto space-y-1">
                {friends.length === 0 ? (
                  <p className="text-xs text-white/60 text-center py-6">
                    Du hast noch keine Freunde auf EVENDLE.
                  </p>
                ) : (
                  friends.map((f) => {
                    const selected = selectedFriendIds.includes(f.user_id);
                    const avatar =
                      f.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name || "?")}&background=1E3323&color=fff&size=80`;
                    return (
                      <button
                        key={f.user_id}
                        type="button"
                        onClick={() => toggleFriend(f.user_id)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition ${
                          selected ? "bg-[hsl(var(--bolt))]/15" : "hover:bg-white/5"
                        }`}
                      >
                        <img src={avatar} alt={f.name} className="w-8 h-8 rounded-full object-cover" />
                        <span className="flex-1 text-left text-sm font-semibold text-white truncate">
                          {f.name}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selected
                              ? "bg-[hsl(var(--bolt))] border-[hsl(var(--bolt))]"
                              : "border-white/30"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 text-[hsl(var(--blitz-forest))]" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })
                )}
                {selectedFriendIds.length > 0 && (
                  <p className="text-[10px] text-white/60 text-center pt-2 uppercase tracking-widest font-bold">
                    {selectedFriendIds.length} ausgewählt
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
            {locating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                <span className="text-sm text-white/70">Detecting location…</span>
              </>
            ) : coords ? (
              <>
                <MapPin className="w-5 h-5 text-[hsl(var(--bolt))]" />
                <span className="text-sm text-white/80">
                  Location active · visible within {radius} km
                </span>
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5 text-white/50" />
                <div className="flex-1 text-sm text-white/70">
                  {locError ?? "Location required."}
                </div>
                <button
                  onClick={requestLocation}
                  className="px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-[11px] font-black uppercase tracking-wider"
                >
                  Allow
                </button>
              </>
            )}
          </div>
        </div>
        </div>

        {/* Sticky bottom CTA — always visible */}
        <div
          className="absolute left-0 right-0 bottom-0 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-gradient-to-t from-[hsl(var(--blitz-forest))] via-[hsl(var(--blitz-forest))] to-transparent"
        >
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] font-black text-lg tracking-[0.15em] uppercase shadow-[0_12px_32px_-8px_hsl(var(--bolt)/0.6)] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5 fill-[hsl(var(--blitz-forest))]" />
            {submitting ? "Blitzing…" : "Blitz now"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlitzModal;

