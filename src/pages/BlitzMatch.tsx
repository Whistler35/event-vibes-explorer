import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Zap, Trash2, Users, MapPin, Heart, Camera, Loader2, Clock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { asBlitzQuestion } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { markHuddleNotificationsRead } from "@/hooks/useNotifications";
import AddFriendToHuddleSheet from "@/components/blitz/AddFriendToHuddleSheet";
import ParticipantChip from "@/components/blitz/ParticipantChip";
import ParticipantOptionsSheet from "@/components/blitz/ParticipantOptionsSheet";
import ExtendHuddleSheet from "@/components/blitz/ExtendHuddleSheet";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { uploadChatPhoto, PHOTO_PLACEHOLDER } from "@/lib/chatPhoto";

interface Match {
  id: string;
  blitz_request_id: string;
  host_id: string;
  status: string;
  chat_expires_at: string;
}

interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  message: string;
  photo_url?: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

const BlitzMatch = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [match, setMatch] = useState<Match | null>(null);
  const [activity, setActivity] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [roleLabels, setRoleLabels] = useState<Map<string, string | null>>(new Map());
  const [optionsForId, setOptionsForId] = useState<string | null>(null);
  const [showExtendSheet, setShowExtendSheet] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, Profile>>(new Map());
  const [input, setInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showMatchSplash, setShowMatchSplash] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [burstId, setBurstId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { reactions, toggleHeart } = useMessageReactions(
    "blitz_chat_message_reactions",
    "match_id",
    matchId,
    user?.id
  );

  const handleDoubleTap = (messageId: string) => {
    toggleHeart(messageId);
    setBurstId(messageId);
    setTimeout(() => setBurstId((cur) => (cur === messageId ? null : cur)), 700);
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  // Read inside the realtime effect without making it a dependency — that
  // effect must only ever (re)subscribe on matchId, never churn the socket
  // every time profilesMap changes (which happens right after mount and was
  // dropping messages that arrived in the brief unsubscribe/resubscribe gap).
  const profilesMapRef = useRef(profilesMap);
  useEffect(() => { profilesMapRef.current = profilesMap; }, [profilesMap]);

  useEffect(() => {
    if (!matchId || !user) return;
    (async () => {
      // Match, participants and messages only need matchId, so they can go
      // out together instead of one-after-another (was 5 sequential
      // round-trips before any chat content could render).
      const [{ data: m }, { data: parts }, { data: msgs }] = await Promise.all([
        supabase.from("blitz_matches").select("*").eq("id", matchId).maybeSingle(),
        supabase.from("blitz_match_participants").select("user_id, role_label").eq("match_id", matchId),
        supabase
          .from("blitz_chat_messages")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true }),
      ]);
      if (!m) {
        toast.error(t("blitzMatch.matchNotFound"));
        navigate("/blitz");
        return;
      }
      setMatch(m as Match);
      setMessages(msgs ?? []);

      const ids = Array.from(new Set([...(parts ?? []).map((p: any) => p.user_id), m.host_id]));
      setParticipantIds(ids);
      setRoleLabels(new Map((parts ?? []).map((p: any) => [p.user_id, p.role_label ?? null])));

      const [{ data: req }, { data: profs }] = await Promise.all([
        supabase.from("blitz_requests").select("activity, city").eq("id", m.blitz_request_id).maybeSingle(),
        supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", ids),
      ]);
      setActivity(req?.activity ?? "");
      setCity((req as any)?.city ?? "");
      setProfilesMap(new Map((profs ?? []).map((p) => [p.user_id, p])));
    })();
  }, [matchId, user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowMatchSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  // Mark this huddle as read (for the chat-list unread dot AND the
  // notification bell) whenever it's open — on entry, and again for every
  // message that arrives while open.
  useEffect(() => {
    if (!matchId || !user) return;
    supabase
      .from("blitz_match_participants")
      .update({ last_read_at: new Date().toISOString() } as any)
      .eq("match_id", matchId)
      .eq("user_id", user.id);
    markHuddleNotificationsRead(user.id, matchId);
  }, [matchId, user]);

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`blitz-chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blitz_chat_messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          if (user) {
            supabase
              .from("blitz_match_participants")
              .update({ last_read_at: new Date().toISOString() } as any)
              .eq("match_id", matchId)
              .eq("user_id", user.id);
            markHuddleNotificationsRead(user.id, matchId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_match_participants", filter: `match_id=eq.${matchId}` },
        async () => {
          const { data: parts } = await supabase
            .from("blitz_match_participants")
            .select("user_id, role_label")
            .eq("match_id", matchId);
          const ids = Array.from(new Set((parts ?? []).map((p: any) => p.user_id)));
          setParticipantIds(ids);
          setRoleLabels(new Map((parts ?? []).map((p: any) => [p.user_id, p.role_label ?? null])));
          const missing = ids.filter((id) => !profilesMapRef.current.has(id));
          if (missing.length) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("user_id, name, avatar_url")
              .in("user_id", missing);
            setProfilesMap((prev) => {
              const next = new Map(prev);
              (profs ?? []).forEach((p: any) => next.set(p.user_id, p));
              return next;
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [matchId]);

  // Realtime alone left the huddle chat stale until you left and re-entered
  // — likely iOS suspending the WebView's WebSocket in the background, which
  // doesn't always self-heal. Poll as a safety net and catch up immediately
  // whenever the app comes back to the foreground.
  useEffect(() => {
    if (!matchId) return;
    const refetchMessages = async () => {
      const { data } = await supabase
        .from("blitz_chat_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      if (!data) return;
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        (data as ChatMessage[]).forEach((m) => byId.set(m.id, m));
        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    };

    const pollId = setInterval(refetchMessages, 4000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refetchMessages();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    let removeCapListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App: CapApp }) => {
        CapApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refetchMessages();
        }).then((handle) => {
          removeCapListener = () => handle.remove();
        });
      });
    }

    return () => {
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
      removeCapListener?.();
    };
  }, [matchId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!match || !user) {
    return (
      <div className="min-h-screen bg-[hsl(var(--blitz-forest))] flex items-center justify-center text-white">
        <Zap className="w-10 h-10 animate-pulse text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))]" />
      </div>
    );
  }

  const others = participantIds.filter((id) => id !== user.id);
  const otherProfiles = others.map((id) => profilesMap.get(id)).filter(Boolean) as Profile[];
  const headerTitle =
    activity ||
    (otherProfiles.length === 1
      ? otherProfiles[0]?.name ?? t("blitzMatch.fallbackName")
      : `${participantIds.length} Teilnehmer`);
  const headerSub =
    otherProfiles.length > 0
      ? otherProfiles.map((p) => p?.name?.split(" ")[0] ?? "?").join(", ")
      : t("blitzMatch.emptyChat");

  const expiresAt = new Date(match.chat_expires_at).getTime();
  const remaining = Math.max(0, expiresAt - now);
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || expired) return;
    const text = input.trim();
    setInput("");
    // Show it instantly instead of waiting on the realtime round-trip; the
    // INSERT event that follows is deduped by id (see the channel effect).
    const { data, error } = await supabase
      .from("blitz_chat_messages")
      .insert({ match_id: match.id, sender_id: user.id, message: text })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) {
      const inserted = data as ChatMessage;
      setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
    }
  };

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file || !match || expired) return;
    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadChatPhoto(user.id, file);
      const { data, error } = await supabase
        .from("blitz_chat_messages")
        .insert({
          match_id: match.id,
          sender_id: user.id,
          message: input.trim() || PHOTO_PLACEHOLDER,
          photo_url: photoUrl,
        })
        .select()
        .single();
      if (error) throw error;
      setInput("");
      if (data) {
        const inserted = data as ChatMessage;
        setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
      }
    } catch (err: any) {
      toast.error(err.message || "Foto konnte nicht gesendet werden");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!match) return;
    if (!confirm(t("blitzMatch.confirmDelete"))) return;
    const { error } = await supabase
      .from("blitz_requests")
      .delete()
      .eq("id", match.blitz_request_id);
    if (error) {
      toast.error(error.message || t("blitzMatch.deleteFailed"));
      return;
    }
    toast.success(t("blitzMatch.deleted"));
    navigate("/messenger");
  };

  if (showMatchSplash) {
    // Splash keeps 1-1 aesthetic for the first accept moment. For subsequent joins the splash is short.
    const firstOther = otherProfiles[0];
    const me = profilesMap.get(user.id);
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--blitz-forest))] text-white overflow-hidden flex flex-col">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(45deg, white 1px, transparent 1px), linear-gradient(-45deg, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute inset-0 bg-[hsl(var(--blitz-pink))] opacity-0 animate-blitz-impact pointer-events-none" />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[hsl(var(--blitz-pink))]">
            {t("blitzMatch.activation")}
          </p>
          <div className="flex items-center gap-3">
            <Avatar className="w-20 h-20 border-2 border-[hsl(var(--blitz-pink))]">
              <AvatarImage src={me?.avatar_url ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-white text-[hsl(var(--blitz-forest))] text-2xl font-black">
                {me?.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="w-14 h-14 bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--blitz-pink))] rounded-full">
              <Zap className="w-8 h-8 text-white fill-white" />
            </div>
            <Avatar className="w-20 h-20 border-2 border-[hsl(var(--blitz-pink))]">
              <AvatarImage src={firstOther?.avatar_url ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-white text-[hsl(var(--blitz-forest))] text-2xl font-black">
                {firstOther?.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-5xl font-black uppercase text-white leading-none">
              {activity || "BLITZ"}
            </h1>
            <p className="text-sm text-white/70 mt-2">
              {participantIds.length} Teilnehmer im Chat
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button
          onClick={() => navigate("/blitz")}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[hsl(var(--blitz-forest))]" />
        </button>
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-black ${
            expired
              ? "bg-white text-muted-foreground"
              : "bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))]"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--blitz-forest))]" />
          {participantIds.length} IN
        </div>
      </div>

      {/* Title + host */}
      <div className="px-5 pt-2 pb-4 shrink-0">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground leading-tight">
          {asBlitzQuestion(headerTitle)}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={otherProfiles[0]?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-black">
              {otherProfiles[0]?.name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-black">
              {otherProfiles[0]?.name?.split(" ")[0] ?? "Host"}
            </span>{" "}
            is hosting
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm text-sm">
            <Zap className="w-3.5 h-3.5 fill-[hsl(var(--blitz-forest))] text-[hsl(var(--blitz-forest))]" />
            <span className="font-black tabular-nums">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
          </div>
          {city && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm text-sm">
              <MapPin className="w-3.5 h-3.5 text-[hsl(var(--blitz-forest))]" />
              <span className="font-semibold">{city}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm text-sm">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{participantIds.length}</span>
          </div>
          {isAdmin && (
            <button
              onClick={handleAdminDelete}
              aria-label={t("blitzMatch.adminDeleteAria")}
              className="ml-auto w-9 h-9 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center transition"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Who's in */}
      <div className="px-5 pb-4 shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">
          {t('blitzMatch.whosIn')}
        </p>
        <div className="flex flex-wrap gap-2">
          {participantIds.map((id) => {
            const p = profilesMap.get(id);
            const isHost = id === match.host_id;
            const isMe = id === user.id;
            const iAmHost = match.host_id === user.id;
            const canLongPress = iAmHost && !isHost;
            return (
              <ParticipantChip
                key={id}
                name={isMe ? "Du" : p?.name?.split(" ")[0] ?? "?"}
                avatarUrl={p?.avatar_url ?? null}
                label={isHost ? "HOST" : roleLabels.get(id) || "IN"}
                onTap={() => { if (!isMe) navigate(`/user/${id}`); }}
                onLongPress={canLongPress ? () => setOptionsForId(id) : undefined}
              />
            );
          })}
        </div>

        <button
          onClick={() => setShowAddFriend(true)}
          className="mt-3 w-full rounded-full py-3 text-[13px] font-semibold text-[hsl(var(--blitz-forest))] border border-[hsl(var(--blitz-forest))]/20 hover:bg-white/60 active:scale-[0.98] transition"
        >
          {t('blitzMatch.inviteMore')}
        </button>

        {match.host_id === user.id && (
          <button
            onClick={() => setShowExtendSheet(true)}
            className="mt-2 w-full rounded-full py-3 text-[13px] font-semibold text-muted-foreground border border-border hover:bg-white/60 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" /> Huddle verlängern
          </button>
        )}

        <AddFriendToHuddleSheet
          open={showAddFriend}
          onOpenChange={setShowAddFriend}
          matchId={match.id}
          activity={activity}
          excludeIds={participantIds}
        />

        <ParticipantOptionsSheet
          matchId={match.id}
          userId={optionsForId}
          userName={profilesMap.get(optionsForId ?? "")?.name?.split(" ")[0] ?? "Person"}
          currentRoleLabel={roleLabels.get(optionsForId ?? "") ?? null}
          onOpenChange={(o) => !o && setOptionsForId(null)}
          onRemoved={(removedId) => {
            setParticipantIds((prev) => prev.filter((id) => id !== removedId));
            setRoleLabels((prev) => {
              const next = new Map(prev);
              next.delete(removedId);
              return next;
            });
          }}
          onRoleSet={(uid, label) => {
            setRoleLabels((prev) => new Map(prev).set(uid, label));
          }}
        />

        <ExtendHuddleSheet
          open={showExtendSheet}
          onOpenChange={setShowExtendSheet}
          matchId={match.id}
          currentExpiresAt={match.chat_expires_at}
          onExtended={(newExpiresAt) => setMatch((prev) => (prev ? { ...prev, chat_expires_at: newExpiresAt } : prev))}
        />
      </div>

      {/* Huddle chat */}
      <div className="px-5 pb-2 shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          The Huddle
        </p>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            {t("blitzMatch.emptyChat")}
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user.id;
          const senderName = profilesMap.get(msg.sender_id)?.name?.split(" ")[0];
          const msgReactions = reactions[msg.id] ?? [];
          return (
            <div
              key={msg.id}
              className={`w-full ${mine ? "flex justify-end" : ""}`}
            >
              <div className="relative max-w-[85%]" onDoubleClick={() => handleDoubleTap(msg.id)}>
                <div
                  className={`${msg.photo_url ? "p-1.5" : "px-4 py-3"} rounded-2xl shadow-sm select-none ${
                    mine
                      ? "bg-[hsl(var(--blitz-forest))] text-white rounded-br-md"
                      : "bg-white text-foreground rounded-bl-md"
                  }`}
                >
                  {!mine && senderName && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/user/${msg.sender_id}`); }}
                      className={`text-[11px] font-black text-[hsl(var(--blitz-forest))] mb-0.5 hover:underline ${msg.photo_url ? "px-2 pt-1" : ""}`}
                    >
                      {senderName}
                    </button>
                  )}
                  {msg.photo_url && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPreviewPhoto(msg.photo_url!); }} className="block">
                      <img
                        src={msg.photo_url}
                        alt=""
                        loading="lazy"
                        className="max-w-[220px] max-h-[280px] w-auto h-auto rounded-xl object-cover"
                      />
                    </button>
                  )}
                  {msg.message && msg.message !== PHOTO_PLACEHOLDER && (
                    <p className={`text-sm break-words whitespace-pre-wrap leading-snug ${msg.photo_url ? "px-2 pt-1.5 pb-0.5" : ""}`}>
                      {msg.message}
                    </p>
                  )}
                </div>
                {msgReactions.length > 0 && (
                  <div
                    className={`absolute -bottom-2.5 ${mine ? "left-1.5" : "right-1.5"} bg-white rounded-full shadow-sm px-1.5 py-0.5 flex items-center gap-0.5`}
                  >
                    <span className="text-xs">❤️</span>
                    {msgReactions.length > 1 && (
                      <span className="text-[10px] font-bold text-muted-foreground">{msgReactions.length}</span>
                    )}
                  </div>
                )}
                {burstId === msg.id && (
                  <Heart
                    className="absolute inset-0 m-auto w-14 h-14 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] pointer-events-none animate-heart-burst"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSend}
        className="shrink-0 border-t border-black/5 bg-background px-4 pt-3 flex items-center gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto || expired}
          className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)] disabled:opacity-50"
          aria-label="Foto senden"
        >
          {uploadingPhoto ? (
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blitz-forest))]" />
          ) : (
            <Camera className="w-5 h-5 text-[hsl(var(--blitz-forest))]" />
          )}
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
        <div className="flex-1 flex items-center gap-2 bg-white rounded-full pl-5 pr-2 py-2 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={expired ? t("blitzMatch.chatExpired") : t("blitzMatch.typeSomething")}
            disabled={expired}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || expired}
            className="w-10 h-10 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center disabled:opacity-30 shadow-sm"
            aria-label="Send"
          >
            <Zap className="w-4 h-4 fill-[hsl(var(--bolt))] text-[hsl(var(--bolt))]" />
          </button>
        </div>
      </form>

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
        >
          <img src={previewPhoto} alt="" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
};

export default BlitzMatch;

