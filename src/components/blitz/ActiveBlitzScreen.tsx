import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BlitzRequest, cancelBlitzRequest } from "@/hooks/useBlitzRequest";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap } from "lucide-react";

interface ActiveBlitzScreenProps {
  request: BlitzRequest;
  onEnded: () => void;
}

const formatRemaining = (ms: number) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const ActiveBlitzScreen = ({ request, onEnded }: ActiveBlitzScreenProps) => {
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresAt = new Date(request.expires_at).getTime();
  const remainingMs = Math.max(0, expiresAt - now);
  const remainingLabel = formatRemaining(remainingMs);

  useEffect(() => {
    if (remainingMs === 0) {
      toast("⚡ Your Blitz expired");
      onEnded();
    }
  }, [remainingMs, onEnded]);

  const { data: me } = useQuery({
    queryKey: ["own-profile-mini-active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });

  // Look up the (most recent) match for this blitz to jump into the huddle
  const { data: myMatch } = useQuery({
    queryKey: ["active-blitz-match", request.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blitz_matches")
        .select("id")
        .eq("blitz_request_id", request.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return (data?.[0] as { id: string } | undefined) ?? null;
    },
  });

  const openHuddle = () => {
    if (myMatch?.id) navigate(`/blitz/match/${myMatch.id}`);
    else toast("Noch niemand dabei – warte auf Anfragen 👀");
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Diesen Blitz beenden?")) return;
    try {
      await cancelBlitzRequest(request.id);
      toast("Blitz cancelled");
      onEnded();
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  const firstName = me?.name?.split(" ")[0] ?? "Du";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openHuddle}
        className="w-full text-left relative overflow-hidden rounded-[28px] bg-[hsl(var(--blitz-forest))] text-white p-8 min-h-[62vh] flex flex-col items-center justify-between active:scale-[0.99] transition"
      >
        <button
          onClick={handleCancel}
          aria-label="Blitz beenden"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-sm"
        >
          <X className="w-4 h-4 text-white/80" />
        </button>

        <div className="text-center pt-4 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/55 font-bold">
            EVENDLE BLITZ
          </p>
          <h1 className="text-6xl font-black leading-none tracking-tight break-words">
            {request.activity}
          </h1>
          <p className="text-white/65 text-[15px]">
            You are hosting · ends in {remainingLabel}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={me?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-[hsl(var(--blitz-forest-deep))] text-white text-xs font-black">
                {firstName[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-white/85 text-sm font-medium">{firstName} is in</span>
          </div>
          <p className="text-[13px] font-black uppercase tracking-[0.4em] text-white/85 pt-4">
            Tap to open huddle
          </p>
        </div>
      </button>

      {/* Timer pill sitting on top of the bottom nav */}
      <div className="flex justify-center -mt-4 relative z-10">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[hsl(var(--blitz-forest))] text-[hsl(var(--bolt))] font-black text-sm shadow-[0_10px_20px_-6px_rgba(0,0,0,0.25)]">
          <Zap className="w-4 h-4 fill-[hsl(var(--bolt))]" />
          ends in {remainingLabel}
        </div>
      </div>
    </div>
  );
};

export default ActiveBlitzScreen;
