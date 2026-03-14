import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ShieldCheck, LogIn, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingEventsCount } from "@/hooks/usePendingEventsCount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FriendSearch from "@/components/FriendSearch";

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

const Profile = () => {
  const { user } = useAuth();
  const { isAdmin, count: pendingCount } = usePendingEventsCount();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, age, country, bio, fun_fact, avatar_url, instagram_username, instagram_followers")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich ausgeloggt");
    navigate("/");
  };

  // Not logged in
  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh] p-6 space-y-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <LogIn className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-foreground text-xl font-bold">Nicht eingeloggt</h2>
            <p className="text-muted-foreground text-sm">Melde dich an, um dein Profil zu sehen und Events zu erstellen.</p>
          </div>
          <Button onClick={() => navigate("/auth")} className="w-full max-w-xs">
            Anmelden
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </Layout>
    );
  }

  const displayName = profile?.name || user.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff5722&color=fff&size=400`;

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-primary text-2xl font-bold">+</div>
            <span className="text-foreground text-xl font-bold">evendle</span>
          </div>
          <div className="flex space-x-2">
            {isAdmin && (
              <Button variant="ghost" size="icon" className="relative text-green-400 hover:text-green-300" onClick={() => navigate("/admin/events")}>
                <ShieldCheck className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/profile/edit")}>
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-primary">
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          </div>

          {/* User Info */}
          <div className="space-y-1">
            <h1 className="text-foreground text-2xl font-bold">
              {displayName}{profile?.age ? `, ${profile.age}` : ""} {profile?.country || ""}
            </h1>
          </div>

          {/* About Me */}
          {(profile?.bio || profile?.fun_fact) && (
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
          {profile?.instagram_username && (
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
                <Button variant="outline">View Profile</Button>
              </div>
            </div>
          )}

          {/* No profile data hint */}
          {!profile && (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground text-sm">Du hast noch kein Profil angelegt.</p>
              <p className="text-muted-foreground text-xs">Profil-Bearbeitung kommt bald!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
