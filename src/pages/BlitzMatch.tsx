import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Send, Zap, Trash2 } from "lucide-react";
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
  participant_id: string;
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
        toast.error("Match not found");
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

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", [m.host_id, m.participant_id]);
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
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
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

  const otherId = match.host_id === user.id ? match.participant_id : match.host_id;
  const me = profilesMap.get(user.id);
  const other = profilesMap.get(otherId);

  const expiresAt = new Date(match.chat_expires_at).getTime();
  const remaining = Math.max(0, expiresAt - now);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
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
    if (!confirm("Diesen Blitz und den zugehörigen Chat als Admin löschen?")) return;
    const { error } = await supabase
      .from("blitz_requests")
      .delete()
      .eq("id", match.blitz_request_id);
    if (error) {
      toast.error(error.message || "Löschen fehlgeschlagen");
      return;
    }
    toast.success("Blitz gelöscht");
    navigate("/messenger");
  };

  if (showMatchSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--blitz-forest))] text-white overflow-hidden flex flex-col">
        {/* Sharp diagonal grid backdrop — urban / sport feeling */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(45deg, white 1px, transparent 1px), linear-gradient(-45deg, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Single hard impact flash — no soft floating gradients */}
        <div className="absolute inset-0 bg-[hsl(var(--blitz-pink))] opacity-0 animate-blitz-impact pointer-events-none" />

        {/* Top label */}
        <div className="relative z-10 pt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[hsl(var(--blitz-pink))]">
            ⚡ Activation
          </p>
        </div>

        {/* Impact stage */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          {/* Shockwave rings radiating from center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-40 h-40 rounded-full border-[hsl(var(--blitz-pink))] animate-blitz-shockwave" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animationDelay: "0.4s" }}>
            <div className="w-40 h-40 rounded-full border-[hsl(var(--blitz-pink))] animate-blitz-shockwave" style={{ animationDelay: "0.4s" }} />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-40 h-40 rounded-full border-[hsl(var(--blitz-pink))] animate-blitz-shockwave" style={{ animationDelay: "0.8s" }} />
          </div>

          {/* Avatars slamming in, asymmetric and angled */}
          <div className="relative flex items-center justify-center w-full max-w-md px-6">
            <div className="animate-blitz-slam-left -mr-4 z-10">
              <div className="relative">
                <Avatar className="w-24 h-24 rounded-none border-2 border-[hsl(var(--blitz-pink))]" style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)" }}>
                  <AvatarImage src={me?.avatar_url ?? undefined} className="object-cover" />
                  <AvatarFallback className="rounded-none bg-white text-[hsl(var(--blitz-forest))] text-3xl font-black">
                    {me?.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[hsl(var(--blitz-pink))] text-white text-[9px] font-black uppercase tracking-wider">
                  P1
                </span>
              </div>
            </div>

            {/* Electric impact between them */}
            <div className="relative z-20 mx-1">
              <div className="relative w-16 h-16 bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_30px_hsl(var(--blitz-pink))]"
                   style={{ clipPath: "polygon(50% 0, 100% 38%, 78% 38%, 100% 100%, 50% 70%, 0 100%, 22% 38%, 0 38%)" }}>
                <Zap className="w-9 h-9 text-white fill-white" strokeWidth={3} />
              </div>
              {/* Spark line tendrils */}
              <div className="absolute top-1/2 -left-10 -translate-y-1/2 h-[3px] w-10 bg-[hsl(var(--blitz-pink))] origin-right animate-blitz-spark shadow-[0_0_12px_hsl(var(--blitz-pink))]" />
              <div className="absolute top-1/2 -right-10 -translate-y-1/2 h-[3px] w-10 bg-[hsl(var(--blitz-pink))] origin-left animate-blitz-spark shadow-[0_0_12px_hsl(var(--blitz-pink))]" />
            </div>

            <div className="animate-blitz-slam-right -ml-4 z-10">
              <div className="relative">
                <Avatar className="w-24 h-24 rounded-none border-2 border-[hsl(var(--blitz-pink))]" style={{ clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)" }}>
                  <AvatarImage src={other?.avatar_url ?? undefined} className="object-cover" />
                  <AvatarFallback className="rounded-none bg-white text-[hsl(var(--blitz-forest))] text-3xl font-black">
                    {other?.name?.[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[hsl(var(--blitz-pink))] text-white text-[9px] font-black uppercase tracking-wider">
                  P2
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Headline + mission card */}
        <div className="relative z-10 px-6 pb-10 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-6xl font-black uppercase text-white leading-[0.85] animate-blitz-headline">
              You're<br/>on!
            </h1>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[hsl(var(--blitz-pink))] pt-2">
              Meetup locked in
            </p>
          </div>

          {/* Mission / Plan card — sharp, no rounded softness */}
          <div className="relative border-2 border-[hsl(var(--blitz-pink))] bg-black/30 backdrop-blur-sm p-4">
            <div className="absolute -top-2.5 left-3 px-2 bg-[hsl(var(--blitz-forest))] text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--blitz-pink))]">
              Mission
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Activity</p>
                <p className="text-xl font-black uppercase text-white truncate">{activity || "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">With</p>
                <p className="text-sm font-bold uppercase text-white truncate max-w-[120px]">
                  {other?.name ?? "Player 2"}
                </p>
              </div>
            </div>
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
        <div className="flex items-center gap-2">
          <Avatar className="w-9 h-9 border border-[hsl(var(--blitz-pink))]">
            <AvatarImage src={other?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[hsl(var(--blitz-pink))] text-white text-sm font-bold">
              {other?.name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="font-bold text-sm">{other?.name ?? "Match"}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/60">{activity}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleAdminDelete}
              aria-label="Blitz als Admin löschen"
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
            {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3 pb-32">
        {messages.length === 0 && (
          <div className="text-center text-white/50 text-sm py-12">
            Message them directly — only 5 min to coordinate ⚡
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user.id;
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
          placeholder={expired ? "Chat expired" : "Type something…"}
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
