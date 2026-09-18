import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Loader2 } from "lucide-react";

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
  const [busy, setBusy] = useState<number | null>(null);

  const extend = async (minutes: number) => {
    setBusy(minutes);
    // Extend from "now" if the huddle already expired, otherwise from its
    // current expiry, so picking +30min always adds exactly 30 minutes of
    // fresh time instead of being wasted on an already-elapsed window.
    const base = Math.max(new Date(currentExpiresAt).getTime(), Date.now());
    const newExpiresAt = new Date(base + minutes * 60000).toISOString();
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
      </SheetContent>
    </Sheet>
  );
};

export default ExtendHuddleSheet;
