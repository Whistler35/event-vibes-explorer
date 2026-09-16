import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";

interface Liker {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
}

const FeedLikesSheet = ({ open, onOpenChange, postId }: Props) => {
  const navigate = useNavigate();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    (async () => {
      const { data: likes } = await supabase
        .from("blitz_feed_post_likes" as any)
        .select("user_id")
        .eq("post_id", postId);
      const ids = ((likes ?? []) as any[]).map((l) => l.user_id);
      if (ids.length === 0) {
        setLikers([]);
        setLoading(false);
        return;
      }
      const { data: profs } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", ids);
      setLikers((profs as Liker[]) ?? []);
      setLoading(false);
    })();
  }, [open, postId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 fill-red-500 text-red-500" /> Gefällt {likers.length === 1 ? "1 Person" : `${likers.length} Personen`}
          </SheetTitle>
        </SheetHeader>
        <div className="py-3 space-y-1">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-6">Lädt…</p>
          ) : likers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Noch keine Likes.</p>
          ) : (
            likers.map((l) => (
              <button
                key={l.user_id}
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/user/${l.user_id}`);
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition text-left"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={l.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-xs font-black">
                    {l.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">{l.name}</p>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedLikesSheet;
