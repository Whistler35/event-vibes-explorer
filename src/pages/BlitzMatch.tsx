import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
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
    const t = setTimeout(() => setShowMatchSplash(false), 2200);
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

  if (showMatchSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--blitz-forest))] flex flex-col items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-[hsl(var(--blitz-pink))] opacity-10 animate-pulse" />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-40 animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-40 animate-pulse" />

        <div className="relative flex items-center gap-6 mb-8">
          <Avatar className="w-24 h-24 border-4 border-[hsl(var(--blitz-pink))] shadow-[0_0_40px_hsl(var(--blitz-pink)/0.7)]">
            <AvatarImage src={me?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-white text-[hsl(var(--blitz-forest))] text-3xl font-black">
              {me?.name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="w-20 h-20 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_60px_hsl(var(--blitz-pink))] animate-blitz-pulse">
            <Zap className="w-12 h-12 text-white fill-white" />
          </div>
          <Avatar className="w-24 h-24 border-4 border-[hsl(var(--blitz-pink))] shadow-[0_0_40px_hsl(var(--blitz-pink)/0.7)]">
            <AvatarImage src={other?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-white text-[hsl(var(--blitz-forest))] text-3xl font-black">
              {other?.name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
        </div>

        <h1 className="relative text-7xl font-black uppercase tracking-tighter text-[hsl(var(--blitz-pink))] drop-shadow-[0_0_30px_hsl(var(--blitz-pink)/0.8)] mb-2">
          MATCH!
        </h1>
        <p className="relative text-white/80 font-bold uppercase tracking-widest text-sm">
          {activity} with {other?.name ?? "your match"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--blitz-forest))] text-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
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
        className="p-3 border-t border-white/10 flex items-center gap-2 bg-[hsl(var(--blitz-forest))]"
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
