import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserX, Tag } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  matchId: string;
  userId: string | null;
  userName: string;
  currentRoleLabel: string | null;
  onOpenChange: (open: boolean) => void;
  onRemoved: (userId: string) => void;
  onRoleSet: (userId: string, label: string | null) => void;
}

/** Host-only long-press menu on a Huddle participant: assign a role label or remove them. */
const ParticipantOptionsSheet = ({
  matchId,
  userId,
  userName,
  currentRoleLabel,
  onOpenChange,
  onRemoved,
  onRoleSet,
}: Props) => {
  const [mode, setMode] = useState<"menu" | "role">("menu");
  const [roleInput, setRoleInput] = useState(currentRoleLabel ?? "");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      setMode("menu");
      setRoleInput(currentRoleLabel ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const saveRole = async () => {
    if (!userId) return;
    setSaving(true);
    const label = roleInput.trim() || null;
    const { error } = await supabase
      .from("blitz_match_participants")
      .update({ role_label: label } as any)
      .eq("match_id", matchId)
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onRoleSet(userId, label);
    toast.success(label ? `Rolle "${label}" vergeben` : "Rolle entfernt");
    onOpenChange(false);
  };

  const doRemove = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("blitz_match_participants")
      .delete()
      .eq("match_id", matchId)
      .eq("user_id", userId);
    setSaving(false);
    setConfirmRemove(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onRemoved(userId);
    toast.success(`${userName} wurde entfernt`);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={!!userId} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>{userName}</SheetTitle>
          </SheetHeader>

          {mode === "menu" ? (
            <div className="py-3 space-y-1">
              <button
                onClick={() => setMode("role")}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition text-left"
              >
                <Tag className="w-4 h-4 text-[hsl(var(--blitz-forest))]" />
                <span className="font-semibold text-sm">Rolle vergeben</span>
              </button>
              <button
                onClick={() => setConfirmRemove(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 transition text-left text-destructive"
              >
                <UserX className="w-4 h-4" />
                <span className="font-semibold text-sm">Aus Huddle entfernen</span>
              </button>
            </div>
          ) : (
            <div className="py-3 space-y-3">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value.slice(0, 40))}
                placeholder="z. B. Getränkelieferant"
                autoFocus
              />
              <Button className="w-full" onClick={saveRole} disabled={saving}>
                Speichern
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{userName} entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              {userName} verliert den Zugriff auf diesen Huddle-Chat und wird nicht benachrichtigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doRemove();
              }}
              disabled={saving}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ParticipantOptionsSheet;
