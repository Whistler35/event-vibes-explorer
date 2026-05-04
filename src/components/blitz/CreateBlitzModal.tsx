import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Zap, MapPin, Loader2, Globe2, Users } from "lucide-react";
import { createBlitzRequest, BlitzAudience } from "@/hooks/useBlitzRequest";
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
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async () => {
    if (!activity.trim()) {
      toast.error("Tell us what you're up for!");
      return;
    }
    if (!coords) {
      toast.error("Location required to Blitz.");
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
      });
      toast.success(audience === "friends" ? "⚡ Blitzed! (nur Freunde)" : "⚡ Blitzed!");
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Could not create");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !!activity.trim() && !!coords;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0 bg-[hsl(var(--blitz-forest))] text-white [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100"
      >
        <div className="px-6 pt-10 pb-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_24px_hsl(var(--blitz-pink)/0.6)]">
              <Zap className="w-7 h-7 text-white fill-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60 font-bold">Blitz</p>
              <h2 className="text-2xl font-black leading-none">Spontaneous Request</h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wide text-white/70">
              What are you up for?
            </label>
            <input
              autoFocus
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. Tennis, Bouldering, Coffee…"
              maxLength={80}
              className="w-full bg-transparent border-b-2 border-white/30 focus:border-[hsl(var(--blitz-pink))] outline-none text-3xl font-black placeholder:text-white/30 py-2 transition"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wide text-white/70">
              How long?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => {
                const active = duration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`py-3 rounded-xl font-black text-lg transition border-2 ${
                      active
                        ? "bg-[hsl(var(--blitz-pink))] border-[hsl(var(--blitz-pink))] text-white shadow-[0_0_20px_hsl(var(--blitz-pink)/0.5)]"
                        : "bg-white/5 border-white/10 text-white/80 hover:border-white/30"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold uppercase tracking-wide text-white/70">
                Radius
              </label>
              <span className="text-2xl font-black text-[hsl(var(--blitz-pink))] tabular-nums">
                {radius} km
              </span>
            </div>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={RADIUS_STEP}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-[hsl(var(--blitz-pink))] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40 font-bold">
              <span>{RADIUS_MIN} km</span>
              <span>{RADIUS_MAX} km</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
            {locating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white/70" />
                <span className="text-sm text-white/70">Detecting location…</span>
              </>
            ) : coords ? (
              <>
                <MapPin className="w-5 h-5 text-[hsl(var(--blitz-pink))]" />
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
                  className="text-xs font-black uppercase tracking-wider text-[hsl(var(--blitz-pink))]"
                >
                  Allow
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full mt-2 py-5 rounded-2xl bg-[hsl(var(--blitz-pink))] text-white font-black text-xl tracking-wider uppercase shadow-[0_8px_32px_hsl(var(--blitz-pink)/0.5)] hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="w-6 h-6 fill-white" />
            {submitting ? "Blitzing…" : "Blitz now"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlitzModal;
