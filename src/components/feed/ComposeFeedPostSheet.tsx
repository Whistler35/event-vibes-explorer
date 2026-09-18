import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, Zap, Globe2, Users, Check } from "lucide-react";
import { useEligibleRecaps } from "@/hooks/useEligibleRecaps";
import { useMatchParticipants } from "@/hooks/useMatchParticipants";
import { trackEvent } from "@/lib/analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  preselectedMatchId?: string | null;
}

const ComposeFeedPostSheet = ({ open, onOpenChange, userId, preselectedMatchId }: Props) => {
  const queryClient = useQueryClient();
  const { data: eligible = [], isLoading: loadingEligible } = useEligibleRecaps(userId);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: participants = [] } = useMatchParticipants(matchId ?? undefined);
  const taggable = participants.filter((p) => p.user_id !== userId);

  useEffect(() => {
    if (!open) return;
    if (preselectedMatchId) {
      setMatchId(preselectedMatchId);
      const match = eligible.find((e) => e.matchId === preselectedMatchId);
      setActivity(match?.activity ?? null);
    } else {
      setMatchId(null);
      setActivity(null);
    }
    setFile(null);
    setPreview(null);
    setCaption("");
    setIsPublic(true);
    setTaggedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedMatchId]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!userId || !matchId || !file) return;
    setPosting(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/feed/${matchId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

      const { data: post, error } = await supabase
        .from("blitz_feed_posts" as any)
        .insert({
          match_id: matchId,
          author_id: userId,
          photo_url: pub.publicUrl,
          caption: caption.trim() || null,
          visibility: isPublic ? "public" : "friends",
        })
        .select("id")
        .single();
      if (error) throw error;

      if (taggedIds.length > 0) {
        await supabase.from("blitz_feed_post_tags" as any).insert(
          taggedIds.map((tagged_user_id) => ({
            post_id: (post as any).id,
            tagged_user_id,
            tagged_by: userId,
          }))
        );
      }

      trackEvent(userId, "feed_post_created", { visibility: isPublic ? "public" : "friends" });
      toast.success("Im Feed geteilt! 🎉");
      queryClient.invalidateQueries({ queryKey: ["blitz-feed", userId] });
      queryClient.invalidateQueries({ queryKey: ["eligible-recaps", userId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Posten fehlgeschlagen");
    } finally {
      setPosting(false);
    }
  };

  const showPicker = !preselectedMatchId && !matchId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{showPicker ? "Welcher Blitz?" : "Foto teilen"}</SheetTitle>
        </SheetHeader>

        {showPicker ? (
          <div className="py-4 space-y-2">
            {loadingEligible ? (
              <p className="text-muted-foreground text-sm text-center py-6">Lädt…</p>
            ) : eligible.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Du hast gerade keinen abgeschlossenen Blitz zum Teilen. Sobald ein Huddle vorbei ist, kannst
                du hier ein Foto posten.
              </p>
            ) : (
              eligible.map((e) => (
                <button
                  key={e.matchId}
                  onClick={() => {
                    setMatchId(e.matchId);
                    setActivity(e.activity);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted hover:bg-muted/70 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))]" />
                  </div>
                  <span className="font-semibold text-sm flex-1">{e.activity || "Blitz"}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {activity && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[hsl(var(--bolt))]/20 text-[hsl(var(--blitz-forest))] text-xs font-black uppercase tracking-wide">
                <Zap className="w-3 h-3 fill-current" /> {activity}
              </span>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
            {preview ? (
              <button onClick={() => fileRef.current?.click()} className="block w-full">
                <img src={preview} alt="" className="w-full aspect-[4/5] object-cover rounded-2xl" />
              </button>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-[4/5] rounded-2xl border-2 border-dashed border-[hsl(var(--blitz-forest))]/30 flex flex-col items-center justify-center gap-2 text-[hsl(var(--blitz-forest))]/70 hover:border-[hsl(var(--bolt))] hover:text-[hsl(var(--bolt))] transition"
              >
                <Camera className="w-10 h-10" />
                <span className="text-sm font-semibold">Foto auswählen</span>
              </button>
            )}

            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 280))}
              placeholder="Bildunterschrift (optional)…"
              rows={2}
              className="resize-none"
            />

            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted">
              <div className="flex items-center gap-2">
                {isPublic ? <Globe2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                <div>
                  <p className="text-sm font-semibold">{isPublic ? "Öffentlich" : "Nur Freunde"}</p>
                  <p className="text-xs text-muted-foreground">
                    {isPublic ? "Jeder auf Evendle kann das sehen" : "Nur deine Freunde sehen das"}
                  </p>
                </div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {taggable.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Personen markieren
                </p>
                <div className="space-y-1">
                  {taggable.map((p) => {
                    const selected = taggedIds.includes(p.user_id);
                    return (
                      <button
                        key={p.user_id}
                        type="button"
                        onClick={() =>
                          setTaggedIds((prev) =>
                            selected ? prev.filter((id) => id !== p.user_id) : [...prev, p.user_id]
                          )
                        }
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition text-left"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-black">
                            {p.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm font-semibold">{p.name}</span>
                        {selected && (
                          <span className="w-5 h-5 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-[hsl(var(--bolt))]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handlePost} disabled={!file || posting}>
              {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Im Feed teilen
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ComposeFeedPostSheet;
