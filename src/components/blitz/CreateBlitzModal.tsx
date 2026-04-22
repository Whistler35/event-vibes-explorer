import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import { createBlitzRequest } from "@/hooks/useBlitzRequest";
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

const CreateBlitzModal = ({ open, onOpenChange, onCreated }: CreateBlitzModalProps) => {
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!activity.trim()) {
      toast.error("Sag uns worauf du Bock hast!");
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
      });
      toast.success("⚡ Geblastet!");
      setActivity("");
      setDuration(60);
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Konnte nicht erstellt werden");
    } finally {
      setSubmitting(false);
    }
  };

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
              <h2 className="text-2xl font-black leading-none">Spontan-Request</h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wide text-white/70">
              Auf was hast du Bock?
            </label>
            <input
              autoFocus
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="z.B. Tennis, Bouldern, Kaffee…"
              maxLength={80}
              className="w-full bg-transparent border-b-2 border-white/30 focus:border-[hsl(var(--blitz-pink))] outline-none text-3xl font-black placeholder:text-white/30 py-2 transition"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wide text-white/70">
              Wie lange?
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

          <button
            onClick={handleSubmit}
            disabled={submitting || !activity.trim()}
            className="w-full mt-2 py-5 rounded-2xl bg-[hsl(var(--blitz-pink))] text-white font-black text-xl tracking-wider uppercase shadow-[0_8px_32px_hsl(var(--blitz-pink)/0.5)] hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Zap className="w-6 h-6 fill-white" />
            {submitting ? "Blasting…" : "Jetzt blasten"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBlitzModal;
