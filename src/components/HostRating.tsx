import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  hostUserId: string;
  interactive?: boolean;
  size?: "sm" | "md";
}

const HostRating = ({ hostUserId, interactive = false, size = "md" }: Props) => {
  const { user } = useAuth();
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchRatings = async () => {
    const { data } = await supabase
      .from("host_ratings")
      .select("rating")
      .eq("host_user_id", hostUserId);

    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setTotalRatings(data.length);
    } else {
      setAvgRating(0);
      setTotalRatings(0);
    }

    if (user && interactive) {
      const { data: myRating } = await supabase
        .from("host_ratings")
        .select("rating")
        .eq("host_user_id", hostUserId)
        .eq("user_id", user.id)
        .maybeSingle();
      setUserRating(myRating?.rating || 0);
    }
  };

  useEffect(() => {
    if (hostUserId) fetchRatings();
  }, [hostUserId, user]);

  const handleRate = async (rating: number) => {
    if (!user || submitting) return;
    if (user.id === hostUserId) {
      toast.error("Du kannst dich nicht selbst bewerten.");
      return;
    }
    setSubmitting(true);

    if (userRating > 0) {
      await supabase
        .from("host_ratings")
        .update({ rating, updated_at: new Date().toISOString() })
        .eq("host_user_id", hostUserId)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("host_ratings")
        .insert({ host_user_id: hostUserId, user_id: user.id, rating } as any);
    }

    setUserRating(rating);
    toast.success("Bewertung gespeichert!");
    await fetchRatings();
    setSubmitting(false);
  };

  const starSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const displayRating = hoverRating || (interactive ? userRating : 0);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = interactive
            ? star <= displayRating
            : star <= Math.round(avgRating);
          return (
            <button
              key={star}
              disabled={!interactive || !user || submitting}
              onClick={() => interactive && handleRate(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(0)}
              className={`${interactive && user ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform disabled:opacity-100`}
            >
              <Star
                className={`${starSize} transition-colors ${
                  filled
                    ? "fill-[#d8d87a] text-[#d8d87a]"
                    : "fill-none text-muted-foreground/40"
                }`}
              />
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-foreground font-bold text-sm">{avgRating > 0 ? avgRating.toFixed(1) : "–"}</span>
        <span className="text-muted-foreground text-xs">({totalRatings})</span>
      </div>
      {interactive && user && userRating > 0 && (
        <p className="text-muted-foreground text-[10px]">Deine Bewertung: {userRating}/5</p>
      )}
    </div>
  );
};

export default HostRating;
