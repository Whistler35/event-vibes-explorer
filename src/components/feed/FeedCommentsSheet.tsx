import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
  userId: string | undefined;
}

const FeedCommentsSheet = ({ open, onOpenChange, postId, userId }: Props) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!postId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("blitz_feed_post_comments" as any)
      .select("id, user_id, comment, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const list = (rows ?? []) as any[];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", ids)
      : { data: [] as any[] };
    setComments(
      list.map((r) => {
        const p = profs?.find((x: any) => x.user_id === r.user_id);
        return { ...r, name: p?.name || "Jemand", avatar_url: p?.avatar_url || null };
      })
    );
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !postId || !userId) return;
    setSending(true);
    const { error } = await supabase
      .from("blitz_feed_post_comments" as any)
      .insert({ post_id: postId, user_id: userId, comment: trimmed });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    load();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[80vh] flex flex-col p-0">
        <SheetHeader className="text-left px-6 pt-6 pb-2 shrink-0">
          <SheetTitle>Kommentare</SheetTitle>
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-2 space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-6">Lädt…</p>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Noch keine Kommentare. Schreib den ersten!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <button onClick={() => navigate(`/user/${c.user_id}`)} className="shrink-0">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-black">
                      {c.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{c.name}</span>{" "}
                    <span className="text-foreground/90">{c.comment}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="shrink-0 flex items-end gap-2 px-4 py-3 border-t bg-background" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kommentar schreiben…"
            rows={1}
            className="resize-none min-h-[40px] max-h-24"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedCommentsSheet;
