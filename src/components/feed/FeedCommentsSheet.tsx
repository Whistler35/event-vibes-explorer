import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, MoreVertical, Pencil, Trash2, Check, X, Flag } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { trackEvent } from "@/lib/analytics";
import ReportDialog from "@/components/moderation/ReportDialog";

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  edited_at: string | null;
  mentioned_user_ids: string[];
  name: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
  userId: string | undefined;
}

// Renders comment text, turning any "@Name" that matches a real mentioned
// user into a highlighted span. Matching by name (not offsets) is good
// enough here since mentions always come from the autocomplete, never
// free-typed.
function renderCommentText(comment: Comment, namesById: Map<string, string>) {
  if (!comment.mentioned_user_ids?.length) return comment.comment;
  const mentionNames = comment.mentioned_user_ids
    .map((id) => namesById.get(id))
    .filter(Boolean) as string[];
  if (mentionNames.length === 0) return comment.comment;

  const pattern = new RegExp(`@(${mentionNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = comment.comment.split(pattern);
  return parts.map((part, i) =>
    mentionNames.includes(part) ? (
      <span key={i} className="text-[hsl(var(--blitz-forest))] font-bold">
        @{part}
      </span>
    ) : (
      part
    )
  );
}

const FeedCommentsSheet = ({ open, onOpenChange, postId, userId }: Props) => {
  const navigate = useNavigate();
  const { data: friends = [] } = useFriends(userId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionIds, setMentionIds] = useState<Record<string, string>>({}); // name -> user_id, for names inserted via autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [reportComment, setReportComment] = useState<Comment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const namesById = useMemo(() => new Map(friends.map((p) => [p.user_id, p.name])), [friends]);

  const load = async () => {
    if (!postId) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("blitz_feed_post_comments" as any)
      .select("id, user_id, comment, created_at, edited_at, mentioned_user_ids")
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

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return friends.filter((p) => p.user_id !== userId && p.name?.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, friends, userId]);

  const handleTextChange = (value: string) => {
    setText(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const pickMention = (name: string, id: string) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const upToCursor = text.slice(0, cursor);
    const replaced = upToCursor.replace(/@([^\s@]*)$/, `@${name} `);
    const next = replaced + text.slice(cursor);
    setText(next);
    setMentionIds((prev) => ({ ...prev, [name]: id }));
    setMentionQuery(null);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const extractMentionIds = (value: string) =>
    Object.entries(mentionIds)
      .filter(([name]) => value.includes(`@${name}`))
      .map(([, id]) => id);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !postId || !userId) return;
    setSending(true);
    const { error } = await supabase.from("blitz_feed_post_comments" as any).insert({
      post_id: postId,
      user_id: userId,
      comment: trimmed,
      mentioned_user_ids: extractMentionIds(trimmed),
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    trackEvent(userId, "feed_post_commented", { post_id: postId });
    setText("");
    setMentionIds({});
    load();
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditText(c.comment);
  };

  const saveEdit = async (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from("blitz_feed_post_comments" as any)
      .update({ comment: trimmed, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("blitz_feed_post_comments" as any).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
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
                  {editingId === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={1}
                        className="resize-none min-h-[36px] text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(c.id)} className="shrink-0 text-[hsl(var(--blitz-forest))]">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="shrink-0 text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm">
                      <span className="font-semibold">{c.name}</span>{" "}
                      <span className="text-foreground/90">{renderCommentText(c, namesById)}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}
                    {c.edited_at ? " · bearbeitet" : ""}
                  </p>
                </div>
                {editingId !== c.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 shrink-0" aria-label="Optionen">
                      <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {c.user_id === userId ? (
                        <>
                          <DropdownMenuItem onClick={() => startEdit(c)}>
                            <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Löschen
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => setReportComment(c)}>
                          <Flag className="w-4 h-4 mr-2" /> Melden
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
        </div>
        <div className="shrink-0 relative px-4 py-3 border-t bg-background" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          {mentionCandidates.length > 0 && (
            <div className="absolute left-4 right-4 bottom-full mb-1 bg-card border rounded-2xl shadow-lg overflow-hidden">
              {mentionCandidates.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => pickMention(p.name, p.user_id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition text-left"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[9px] font-black">
                      {p.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Kommentar schreiben… (@ für Erwähnung)"
              rows={1}
              className="resize-none min-h-[40px] max-h-24"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && mentionCandidates.length === 0) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
      {reportComment && (
        <ReportDialog
          open={!!reportComment}
          onOpenChange={(o) => !o && setReportComment(null)}
          reportedUserId={reportComment.user_id}
          reportedUserName={reportComment.name}
          context="feed_comment"
          reportedMessageId={reportComment.id}
        />
      )}
    </Sheet>
  );
};

export default FeedCommentsSheet;
