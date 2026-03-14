import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ProfileStatsSheet from "@/components/ProfileStatsSheet";

interface ProfileData {
  name: string;
  age: number | null;
  country: string | null;
  bio: string | null;
  fun_fact: string | null;
  avatar_url: string | null;
  instagram_username: string | null;
  instagram_followers: string | null;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hostedCount: 0, participatedCount: 0, friendsCount: 0 });
  const [statsSheet, setStatsSheet] = useState<{ open: boolean; tab: "hosted" | "participated" | "friends" }>({ open: false, tab: "hosted" });

  const handleStartDM = async () => {
    if (!user || !userId) {
      toast.error("Bitte melde dich an, um Nachrichten zu senden.");
      return;
    }
    const { data, error } = await supabase.rpc("get_or_create_dm", {
      p_user1: user.id,
      p_user2: userId,
    });
    if (error) {
      toast.error("Chat konnte nicht erstellt werden.");
      return;
    }
    navigate(`/dm/${data}`);
  };

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, age, country, bio, fun_fact, avatar_url, instagram_username, instagram_followers")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }

      const [friendsRes, hostedRes, participatedRes] = await Promise.all([
        supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", userId),
        supabase.from("event_participants").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setStats({
        friendsCount: friendsRes.count || 0,
        hostedCount: hostedRes.count || 0,
        participatedCount: participatedRes.count || 0,
      });

      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
          <p className="text-muted-foreground">Profil nicht gefunden.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Zurück</Button>
        </div>
      </Layout>
    );
  }

  const displayName = profile.name || "Unbekannt";
  const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff5722&color=fff&size=400`;

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground text-xl font-bold">Profil</h1>
        </div>

        {/* Profile Info */}
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-primary">
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          </div>

          {/* User Info */}
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-bold">
              {displayName}{profile.age ? `, ${profile.age}` : ""} {profile.country || ""}
            </h2>
          </div>

          {/* Send Message Button */}
          {user && userId !== user.id && (
            <Button onClick={handleStartDM} className="w-full max-w-xs mx-auto">
              <MessageCircle className="w-4 h-4 mr-2" />
              Nachricht senden
            </Button>
          )}

          {/* About Me */}
          {(profile.bio || profile.fun_fact) && (
            <div className="text-left space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="text-foreground font-bold text-lg mb-2">About me:</h3>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </div>
              )}
              {profile.fun_fact && (
                <div>
                  <h3 className="text-foreground font-bold text-lg mb-2">Fun fact:</h3>
                  <p className="text-muted-foreground">{profile.fun_fact}</p>
                </div>
              )}
            </div>
          )}

          {/* Instagram Section */}
          {profile.instagram_username && (
            <div className="space-y-4">
              <h3 className="text-foreground font-bold text-lg text-left">Instagram</h3>
              <div className="flex items-center justify-between bg-card rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">{profile.instagram_username}</p>
                    {profile.instagram_followers && (
                      <p className="text-muted-foreground text-sm">{profile.instagram_followers}</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href={`https://instagram.com/${profile.instagram_username.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">
                    View Profile
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
