import { useEffect, useRef, useState } from "react";
import { SHEET_MAX_H_88 } from "@/lib/sheetClasses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, Zap, Globe2, Users, Check, Search, X, Trash2 } from "lucide-react";
import { useEligibleRecaps } from "@/hooks/useEligibleRecaps";
import { useMatchParticipants } from "@/hooks/useMatchParticipants";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { trackEvent } from "@/lib/analytics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  preselectedMatchId?: string | null;
}

const ComposeFeedPostSheet = ({ open, onOpenChange, userId, preselectedMatchId }: Props) => {
  const queryClient = useQueryClient();
  const { data: eligible = [], isLoading: loadingEligible, dismiss: dismissRecap } = useEligibleRecaps(userId);
  const { isAdmin } = useIsAdmin();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [namingCustomBlitz, setNamingCustomBlitz] = useState(false);
  const [customActivity, setCustomActivity] = useState("");
  const [creatingBlitz, setCreatingBlitz] = useState(false);
  const [standaloneAdminPost, setStandaloneAdminPost] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [taggedProfiles, setTaggedProfiles] = useState<Map<string, { name: string; avatar_url: string | null }>>(new Map());
  const fileRef = useRef<HTMLInputElement>(null);
  const customActivityRef = useRef<HTMLInputElement>(null);

  // Focusing (and thus opening the keyboard) the instant this step's input
  // mounts can visibly fight with the sheet's own reflow for a frame or two
  // — a short delay lets everything settle first. preventScroll stops the
  // browser's own "scroll the focused element into view" from overshooting
  // and hiding content above it that already fit on screen just fine.
  useEffect(() => {
    if (!namingCustomBlitz) return;
    const t = setTimeout(() => customActivityRef.current?.focus({ preventScroll: true }), 150);
    return () => clearTimeout(t);
  }, [namingCustomBlitz]);

  const { data: participants = [] } = useMatchParticipants(matchId ?? undefined);
  const taggable = participants.filter((p) => p.user_id !== userId);

  // Only for admin standalone posts (no real Huddle → no real participants to
  // pick from): search all profiles instead, since anyone can be tagged.
  const { data: tagSearchResults = [] } = useQuery({
    queryKey: ["feed-post-tag-search", tagSearch],
    enabled: standaloneAdminPost && tagSearch.trim().length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .neq("user_id", userId ?? "")
        .ilike("name", `%${tagSearch.trim()}%`)
        .limit(15);
      return (data ?? []) as { user_id: string; name: string; avatar_url: string | null }[];
    },
  });

  const toggleStandaloneTag = (p: { user_id: string; name: string; avatar_url: string | null }) => {
    setTaggedIds((prev) =>
      prev.includes(p.user_id) ? prev.filter((id) => id !== p.user_id) : [...prev, p.user_id]
    );
    setTaggedProfiles((prev) => {
      const next = new Map(prev);
      if (next.has(p.user_id)) next.delete(p.user_id);
      else next.set(p.user_id, { name: p.name, avatar_url: p.avatar_url });
      return next;
    });
  };

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
    setNamingCustomBlitz(false);
    setCustomActivity("");
    setStandaloneAdminPost(false);
    setTagSearch("");
    setTaggedProfiles(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedMatchId]);

  // Admin-only: post to the Feed without a real Huddle behind it (e.g.
  // backfilling older activity). The feed data model always joins through a
  // real blitz_matches -> blitz_requests row, so this creates a minimal one
  // — already expired (expires_at = now) so it never shows up anywhere as
  // an active/joinable Blitz, and specifically doesn't fire the "Blitz
  // nearby" push (that trigger now skips already-expired rows).
  const createStandaloneBlitzForPost = async (activityName: string) => {
    if (!userId) return null;
    const coords = await new Promise<{ lat: number; lng: number }>((resolve) => {
      if (!("geolocation" in navigator)) return resolve({ lat: 0, lng: 0 });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 0, lng: 0 }),
        { timeout: 8000 }
      );
    });
    const now = new Date().toISOString();

    const { data: req, error: reqErr } = await supabase
      .from("blitz_requests")
      .insert({
        host_id: userId,
        activity: activityName.trim(),
        duration_minutes: 15,
        city: null,
        latitude: coords.lat,
        longitude: coords.lng,
        radius_km: 1,
        expires_at: now,
        status: "cancelled",
        audience: "public",
      })
      .select()
      .single();
    if (reqErr) throw reqErr;

    const { data: match, error: matchErr } = await supabase
      .from("blitz_matches")
      .insert({ blitz_request_id: req.id, host_id: userId, chat_expires_at: now })
      .select()
      .single();
    if (matchErr) throw matchErr;

    await supabase.from("blitz_match_participants").insert({ match_id: match.id, user_id: userId });
    return match.id as string;
  };

  const handleConfirmCustomActivity = async () => {
    if (!customActivity.trim()) return;
    setCreatingBlitz(true);
    try {
      const newMatchId = await createStandaloneBlitzForPost(customActivity);
      if (newMatchId) {
        setMatchId(newMatchId);
        setActivity(customActivity.trim());
        setStandaloneAdminPost(true);
        // Without this, showPicker/namingCustomBlitz's ternary keeps
        // rendering the naming step forever — matchId gets set correctly,
        // but the sheet never visibly moves on to "Foto teilen".
        setNamingCustomBlitz(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Konnte Blitz nicht anlegen");
    } finally {
      setCreatingBlitz(false);
    }
  };

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

      const postId = crypto.randomUUID();
      const { error } = await supabase.from("blitz_feed_posts" as any).insert({
        id: postId,
        match_id: matchId,
        author_id: userId,
        photo_url: pub.publicUrl,
        caption: caption.trim() || null,
        visibility: isPublic ? "public" : "friends",
      });
      if (error) throw error;

      if (taggedIds.length > 0) {
        await supabase.from("blitz_feed_post_tags" as any).insert(
          taggedIds.map((tagged_user_id) => ({
            post_id: postId,
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

  const showPicker = !preselectedMatchId && !matchId && !namingCustomBlitz;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={`rounded-t-3xl ${SHEET_MAX_H_88} overflow-y-auto`}>
        <SheetHeader className="text-left">
          <SheetTitle>{namingCustomBlitz ? "Blitz benennen" : showPicker ? "Welcher Blitz?" : "Foto teilen"}</SheetTitle>
        </SheetHeader>

        {namingCustomBlitz ? (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Als Admin kannst du einen Feed-Post ohne echten Huddle dazu posten — gib einfach an, worum es ging.
            </p>
            <Input
              ref={customActivityRef}
              value={customActivity}
              onChange={(e) => setCustomActivity(e.target.value)}
              placeholder="z.B. Sommerfest 2026"
              maxLength={80}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setNamingCustomBlitz(false)} disabled={creatingBlitz}>
                Zurück
              </Button>
              <Button className="flex-1" onClick={handleConfirmCustomActivity} disabled={!customActivity.trim() || creatingBlitz}>
                {creatingBlitz ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Weiter
              </Button>
            </div>
          </div>
        ) : showPicker ? (
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
                <div
                  key={e.matchId}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-muted hover:bg-muted/70 transition"
                >
                  <button
                    onClick={() => {
                      setMatchId(e.matchId);
                      setActivity(e.activity);
                    }}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))]" />
                    </div>
                    <span className="font-semibold text-sm flex-1 truncate">{e.activity || "Blitz"}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Blitz aus der Liste entfernen"
                    onClick={async () => {
                      if (!confirm(`"${e.activity || "Blitz"}" aus dieser Liste entfernen? Du kannst später nicht mehr direkt dazu posten.`)) return;
                      try {
                        await dismissRecap(e.matchId);
                      } catch (err: any) {
                        toast.error(err.message || "Konnte nicht entfernt werden");
                      }
                    }}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
            {isAdmin && (
              <button
                onClick={() => setNamingCustomBlitz(true)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-[hsl(var(--blitz-forest))]/30 hover:border-[hsl(var(--blitz-forest))]/60 transition text-left"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-[hsl(var(--blitz-forest))]" />
                </div>
                <span className="font-semibold text-sm flex-1">Blitz ohne Huddle benennen (Admin)</span>
              </button>
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

            {standaloneAdminPost ? (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Personen markieren (Admin — jede:r wählbar, unabhängig vom Blitz)
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Nach Namen suchen…"
                    className="pl-9"
                  />
                </div>

                {taggedProfiles.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(taggedProfiles.entries()).map(([id, p]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleStandaloneTag({ user_id: id, name: p.name, avatar_url: p.avatar_url })}
                        className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-full bg-[hsl(var(--blitz-forest))]/10 text-[hsl(var(--blitz-forest))] text-xs font-semibold"
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[9px] font-black">
                            {p.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        {p.name} <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                {tagSearch.trim().length >= 2 && (
                  <div className="space-y-1">
                    {tagSearchResults.length === 0 ? (
                      <p className="text-muted-foreground text-xs px-2 py-1">Keine Personen gefunden.</p>
                    ) : (
                      tagSearchResults.map((p) => {
                        const selected = taggedIds.includes(p.user_id);
                        return (
                          <button
                            key={p.user_id}
                            type="button"
                            onClick={() => toggleStandaloneTag(p)}
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
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              taggable.length > 0 && (
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
              )
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
