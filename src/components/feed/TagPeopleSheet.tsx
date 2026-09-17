import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMatchParticipants } from "@/hooks/useMatchParticipants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string | undefined;
  currentUserId: string | undefined;
  initialSelected: string[];
  onSave: (userIds: string[]) => void;
}

const TagPeopleSheet = ({ open, onOpenChange, matchId, currentUserId, initialSelected, onSave }: Props) => {
  const { data: participants = [], isLoading } = useMatchParticipants(matchId);
  const [selected, setSelected] = useState<string[]>(initialSelected);

  useEffect(() => {
    if (open) setSelected(initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const others = participants.filter((p) => p.user_id !== currentUserId);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Personen markieren</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-1">
          {isLoading ? (
            <p className="text-muted-foreground text-sm text-center py-6">Lädt…</p>
          ) : others.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              Niemand sonst war bei diesem Blitz dabei.
            </p>
          ) : (
            others.map((p) => {
              const isSelected = selected.includes(p.user_id);
              return (
                <button
                  key={p.user_id}
                  onClick={() => toggle(p.user_id)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition text-left"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-xs font-black">
                      {p.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="flex-1 font-semibold text-sm">{p.name}</p>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-[hsl(var(--bolt))]" />
                    </span>
                  )}
                </button>
              );
            })
          )}
          {others.length > 0 && (
            <Button className="w-full mt-3" onClick={() => onSave(selected)}>
              Fertig{selected.length > 0 ? ` (${selected.length})` : ""}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TagPeopleSheet;
