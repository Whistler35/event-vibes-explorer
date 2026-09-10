import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyBlitzMatches } from "@/hooks/useBlitzMatching";
import { useEffect, useState } from "react";

const Countdown = ({ target }: { target: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(target).getTime() - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
};

const MyMatchesBanner = () => {
  const { matches } = useMyBlitzMatches();
  const navigate = useNavigate();

  if (matches.length === 0) return null;

  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <button
          key={m.id}
          onClick={() => navigate(`/blitz/match/${m.id}`)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[hsl(var(--blitz-forest))] text-white shadow-[0_10px_24px_-10px_rgba(30,51,35,0.4)] hover:scale-[1.01] active:scale-[0.99] transition"
        >
          <Avatar className="w-10 h-10 border-2 border-[hsl(var(--bolt))]">
            <AvatarImage src={m.preview_avatars[0] ?? undefined} />
            <AvatarFallback className="bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] font-black text-sm">
              {m.preview_names[0]?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="font-black uppercase text-xs tracking-wider text-[hsl(var(--bolt))] flex items-center gap-1">
              <Zap className="w-3 h-3 fill-[hsl(var(--bolt))]" /> Match aktiv · {m.participant_count} 👥
            </p>
            <p className="font-bold truncate">{m.activity ?? "Blitz"}</p>
          </div>
          <div className="font-black tabular-nums text-lg">
            <Countdown target={m.chat_expires_at} />
          </div>
        </button>
      ))}
    </div>
  );
};

export default MyMatchesBanner;
