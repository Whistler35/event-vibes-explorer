import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users } from "lucide-react";

interface Friend {
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Props {
  userId: string;
  onAddFriend?: () => void;
  isOwnProfile?: boolean;
}

const FriendsCarousel = ({ userId, onAddFriend, isOwnProfile = true }: Props) => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (!fs || fs.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }
      const ids = fs.map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, bio")
        .in("user_id", ids);
      setFriends((profs as Friend[]) || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const avatar = (f: Friend) =>
    f.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=ff2d78&color=fff&size=128`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-[hsl(var(--blitz-pink))]" />
          {isOwnProfile ? "Deine Blitz-Community" : "Blitz-Community"}
          <span className="text-white/60 font-medium">({friends.length})</span>
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
        {loading ? (
          <p className="text-white/60 text-sm py-4">Laden...</p>
        ) : (
          <>
            <button
              onClick={onAddFriend}
              className="shrink-0 w-32 rounded-2xl border-2 border-dashed border-white/25 p-3 flex flex-col items-center justify-center gap-1 text-white/70 hover:border-[hsl(var(--blitz-pink))] hover:text-[hsl(var(--blitz-pink))] transition"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold">Freund finden</span>
            </button>
            {friends.map((f) => (
              <button
                key={f.user_id}
                onClick={() => navigate(`/user/${f.user_id}`)}
                className="shrink-0 w-32 rounded-2xl bg-white/5 border border-white/10 p-3 text-left hover:bg-white/10 transition"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-[hsl(var(--blitz-pink))]/40 mx-auto">
                  <img src={avatar(f)} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <p className="text-white font-bold text-sm mt-2 text-center truncate">{f.name}</p>
                <p className="text-white/60 text-xs text-center truncate">
                  {f.bio ? f.bio.slice(0, 22) + (f.bio.length > 22 ? "…" : "") : "Blitz-Buddy"}
                </p>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsCarousel;
