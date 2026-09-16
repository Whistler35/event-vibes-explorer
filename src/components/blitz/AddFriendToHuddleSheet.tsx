import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, Share2, Check } from "lucide-react";
import { shareInvite } from "@/lib/share";

interface Friend {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  activity: string | null;
  excludeIds: string[];
}

const AddFriendToHuddleSheet = ({ open, onOpenChange, matchId, activity, excludeIds }: Props) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const ids = Array.from(
        new Set((fs ?? []).map((f: any) => (f.requester_id === user.id ? f.addressee_id : f.requester_id)))
      );
      if (ids.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      setFriends((profs as Friend[]) ?? []);
      setLoading(false);
    })();
  }, [open, user]);

  const available = friends.filter((f) => !excludeIds.includes(f.user_id) && !addedIds.has(f.user_id));

  const handleAdd = async (friendId: string) => {
    setPendingId(friendId);
    const { error } = await supabase.rpc("add_friend_to_huddle", {
      p_match_id: matchId,
      p_friend_id: friendId,
    } as any);
    setPendingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAddedIds((prev) => new Set(prev).add(friendId));
    toast.success("Freund hinzugefügt");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Freund zum Huddle hinzufügen</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-2">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-6">Lädt…</p>
          ) : available.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              {friends.length === 0
                ? "Du hast noch keine Freunde auf EVENDLE."
                : "Alle deine Freunde sind schon im Huddle."}
            </p>
          ) : (
            available.map((f) => (
              <div key={f.user_id} className="flex items-center gap-3 p-2 rounded-xl">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={f.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-xs font-black">
                    {f.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <p className="flex-1 font-semibold text-sm truncate">{f.name}</p>
                <Button
                  size="sm"
                  onClick={() => handleAdd(f.user_id)}
                  disabled={pendingId === f.user_id}
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Hinzufügen
                </Button>
              </div>
            ))
          )}
          {addedIds.size > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Check className="w-3.5 h-3.5" /> {addedIds.size} hinzugefügt
            </p>
          )}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() =>
              shareInvite({
                title: activity || "Blitz",
                text: `Join my Blitz${activity ? `: ${activity}` : ""}`,
                url: `${window.location.origin}/blitz/${matchId}`,
                copiedMessage: "Einladungslink kopiert",
              })
            }
          >
            <Share2 className="w-4 h-4 mr-2" /> Per Link einladen (auch für Nicht-EVENDLE-Freunde)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddFriendToHuddleSheet;
