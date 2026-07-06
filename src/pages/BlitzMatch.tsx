import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send, Zap, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, Profile>>(new Map());
  const [input, setInput] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showMatchSplash, setShowMatchSplash] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId || !user) return;
    (async () => {
      const { data: m } = await supabase
        .from("blitz_matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (!m) {
        toast.error(t("blitzMatch.matchNotFound"));
        navigate("/blitz");
        return;
      }
      setMatch(m as Match);

      const { data: req } = await supabase
        .from("blitz_requests")
        .select("activity")
        .eq("id", m.blitz_request_id)
        .maybeSingle();
      setActivity(req?.activity ?? "");

      const { data: parts } = await supabase
        .from("blitz_match_participants")
        .select("user_id")
        .eq("match_id", matchId);
      const ids = Array.from(new Set([...(parts ?? []).map((p: any) => p.user_id), m.host_id]));
      setParticipantIds(ids);

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      setProfilesMap(new Map((profs ?? []).map((p) => [p.user_id, p])));

      const { data: msgs } = await supabase
        .from("blitz_chat_messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      setMessages(msgs ?? []);
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

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`blitz-chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blitz_chat_messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage])
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_match_participants", filter: `match_id=eq.${matchId}` },
        async () => {
          const { data: parts } = await supabase
            .from("blitz_match_participants")
            .select("user_id")
            .eq("match_id", matchId);
          const ids = Array.from(new Set((parts ?? []).map((p: any) => p.user_id)));
          setParticipantIds(ids);
          const missing = ids.filter((id) => !profilesMap.has(id));
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
  }, [matchId, profilesMap]);

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
    const { error } = await supabase.from("blitz_chat_messages").insert({
      match_id: match.id,
      sender_id: user.id,
      message: text,
    });
    if (error) toast.error(error.message);
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
    <div className="h-[100dvh] bg-[hsl(var(--blitz-forest))] text-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <button onClick={() => navigate("/blitz")} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-2">
            {otherProfiles.slice(0, 3).map((p) => (
              <Avatar key={p.user_id} className="w-8 h-8 border-2 border-[hsl(var(--blitz-forest))]">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[hsl(var(--blitz-pink))] text-white text-xs font-bold">
                  {p.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {otherProfiles.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-[hsl(var(--blitz-forest))] flex items-center justify-center text-[10px] font-black">
                +{otherProfiles.length - 3}
              </div>
            )}
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-sm truncate flex items-center gap-1">
              <Zap className="w-3 h-3 fill-[hsl(var(--blitz-pink))] text-[hsl(var(--blitz-pink))]" />
              {headerTitle}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/60 truncate flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              {participantIds.length} · {headerSub}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleAdminDelete}
              aria-label={t("blitzMatch.adminDeleteAria")}
              className="w-9 h-9 rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center transition"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
          <div
            className={`px-3 py-1.5 rounded-full font-black tabular-nums text-sm ${
              expired
                ? "bg-white/10 text-white/40"
                : "bg-[hsl(var(--blitz-pink))] text-white shadow-[0_0_20px_hsl(var(--blitz-pink)/0.5)]"
            }`}
          >
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3 pb-32">
        {messages.length === 0 && (
          <div className="text-center text-white/50 text-sm py-12">
            {t("blitzMatch.emptyChat")}
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user.id;
          const senderName = profilesMap.get(msg.sender_id)?.name?.split(" ")[0];
          return (
            <div
              key={msg.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  mine
                    ? "bg-[hsl(var(--blitz-pink))] text-white rounded-br-sm"
                    : "bg-white/10 text-white rounded-bl-sm"
                }`}
              >
                {!mine && senderName && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-0.5">
                    {senderName}
                  </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSend}
        className="fixed left-0 right-0 bottom-0 p-3 border-t border-white/10 flex items-center gap-2 bg-[hsl(var(--blitz-forest))] z-20"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={expired ? t("blitzMatch.chatExpired") : t("blitzMatch.typeSomething")}
          disabled={expired}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={!input.trim() || expired}
          className="w-11 h-11 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center disabled:opacity-30 shadow-[0_0_20px_hsl(var(--blitz-pink)/0.5)]"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
};

export default BlitzMatch;
