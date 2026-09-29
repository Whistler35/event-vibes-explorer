import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Loader2, Flag } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  currentExpiresAt: string;
  onExtended: (newExpiresAt: string) => void;
}

const OPTIONS = [
  { label: "+15 Minuten", minutes: 15 },
  { label: "+30 Minuten", minutes: 30 },
  { label: "+1 Stunde", minutes: 60 },
  { label: "+2 Stunden", minutes: 120 },
];

/** Lets the host extend the Huddle chat's own expiry — independent of the Blitz's own auto-expiry from Discover. */
const ExtendHuddleSheet = ({ open, onOpenChange, matchId, currentExpiresAt, onExtended }: Props) => {
  const [busy, setBusy] = useState<number | "custom" | null>(null);
  const [customTime, setCustomTime] = useState("");

  const applyExpiry = async (newExpiresAt: string, busyKey: number | "custom") => {
    setBusy(busyKey);
    const { error } = await supabase
      .from("blitz_matches")
      .update({ chat_expires_at: newExpiresAt } as any)
      .eq("id", matchId);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    onExtended(newExpiresAt);
    toast.success("Huddle verlängert ⏱️");
    onOpenChange(false);
  };

  const extend = (minutes: number) => {
    // Extend from "now" if the huddle already expired, otherwise from its
    // current expiry, so picking +30min always adds exactly 30 minutes of
    // fresh time instead of being wasted on an already-elapsed window.
    const base = Math.max(new Date(currentExpiresAt).getTime(), Date.now());
    applyExpiry(new Date(base + minutes * 60000).toISOString(), minutes);
  };

  const setEndTime = () => {
    if (!customTime) return;
    const [h, m] = customTime.split(":").map(Number);
    const target = new Date();
    target.setSeconds(0, 0);
    target.setHours(h, m);
    // A time earlier than (or equal to) now means the next occurrence of
    // that time is tomorrow — e.g. picking "14:00" at 15:00 should set
    // tomorrow 14:00, not a time already in the past.
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
    applyExpiry(target.toISOString(), "custom");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> Huddle verlängern
          </SheetTitle>
        </SheetHeader>
        <div className="py-3 space-y-1.5">
          {OPTIONS.map((o) => (
            <button
              key={o.minutes}
              onClick={() => extend(o.minutes)}
              disabled={busy !== null}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/70 transition disabled:opacity-50"
            >
              <span className="font-semibold text-sm">{o.label}</span>
              {busy === o.minutes && <Loader2 className="w-4 h-4 animate-spin" />}
            </button>
          ))}
        </div>
        <div className="pt-1 pb-3 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
            <Flag className="w-3 h-3" /> oder Endzeit festlegen
          </p>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="flex-1 p-3 rounded-xl bg-muted text-sm font-semibold outline-none"
            />
            <button
              onClick={setEndTime}
              disabled={!customTime || busy !== null}
              className="px-4 py-3 rounded-xl bg-[hsl(var(--blitz-forest))] text-white text-sm font-bold disabled:opacity-40 shrink-0 flex items-center gap-1.5"
            >
              {busy === "custom" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Setzen"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExtendHuddleSheet;
