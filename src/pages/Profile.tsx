import { useEffect, useState } from "react";
import evendleLogo from "@/assets/evendle-logo.jpeg";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ShieldCheck, LogIn, Users, Building2, Globe, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingEventsCount } from "@/hooks/usePendingEventsCount";
import { useIsHost } from "@/hooks/useIsHost";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FriendSearch from "@/components/FriendSearch";
import ProfileStatsSheet from "@/components/ProfileStatsSheet";
import { Badge } from "@/components/ui/badge";
import { getInstagramUrl } from "@/lib/utils";

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

interface HostProfileData {
  company_name: string | null;
  website_url: string | null;
  instagram_username: string | null;
  is_verified: boolean;
}

interface ProfileStats {
  friendsCount: number;
  hostedCount: number;
  participatedCount: number;
}

const Profile = () => {
  const { user } = useAuth();
  const { isAdmin, count: pendingCount } = usePendingEventsCount();
  const { isHost } = useIsHost();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFriends, setShowFriends] = useState(false);
  const [statsSheet, setStatsSheet] = useState<{ open: boolean; tab: "hosted" | "participated" | "friends" }>({ open: false, tab: "hosted" });
  const [stats, setStats] = useState<ProfileStats>({ friendsCount: 0, hostedCount: 0, participatedCount: 0 });

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

      // Fetch host profile if host
      const { data: hostData } = await supabase
        .from("host_profiles")
        .select("company_name, website_url, instagram_username, is_verified")
        .eq("user_id", user.id)
        .maybeSingle() as any;

      if (hostData) {
        setHostProfile(hostData);
      }

      const [friendsRes, hostedRes, participatedRes] = await Promise.all([
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("created_by", user.id),
        supabase
          .from("event_participants")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setStats({
        friendsCount: friendsRes.count || 0,
        hostedCount: hostedRes.count || 0,
        participatedCount: participatedRes.count || 0,
      });

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich ausgeloggt");
    navigate("/");
  };

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
  const hostInstagramUrl = getInstagramUrl(hostProfile?.instagram_username);
  const profileInstagramUrl = getInstagramUrl(profile?.instagram_username);

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-xl font-bold">EVENDLE</span>
          </div>
          <div className="flex space-x-2">
            {isHost && (
              <Button variant="ghost" size="icon" className="text-primary hover:text-primary/80" onClick={() => navigate("/host/dashboard")}>
                <Building2 className="w-5 h-5" />
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="icon" className="relative text-primary hover:text-primary/80" onClick={() => navigate("/admin/events")}>
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
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-primary">
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-foreground text-2xl font-bold">
                {displayName}{!isHost && profile?.age ? `, ${profile.age}` : ""}
              </h1>
              {hostProfile?.is_verified && (
                <ShieldCheck className="w-5 h-5 text-primary" />
              )}
            </div>
            {isHost && hostProfile?.company_name && (
              <p className="text-muted-foreground text-sm">{hostProfile.company_name}</p>
            )}
            {isHost && (
              <Badge variant="secondary" className="text-xs mt-1">
                <Building2 className="w-3 h-3 mr-1" />
                Professional Host
              </Badge>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-8">
            <button onClick={() => setStatsSheet({ open: true, tab: "hosted" })} className="text-center">
              <p className="text-foreground text-xl font-bold">{stats.hostedCount}</p>
              <p className="text-muted-foreground text-xs">Gehostet</p>
            </button>
            <button onClick={() => setStatsSheet({ open: true, tab: "participated" })} className="text-center">
              <p className="text-foreground text-xl font-bold">{stats.participatedCount}</p>
              <p className="text-muted-foreground text-xs">Teilgenommen</p>
            </button>
            <button onClick={() => setStatsSheet({ open: true, tab: "friends" })} className="text-center">
              <p className="text-foreground text-xl font-bold">{stats.friendsCount}</p>
              <p className="text-muted-foreground text-xs">Freunde</p>
            </button>
          </div>

          {/* Host Links */}
          {isHost && (hostProfile?.website_url || hostInstagramUrl) && (
            <div className="flex flex-wrap justify-center gap-3">
              {hostProfile?.website_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={hostProfile.website_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-1.5" />
                    Website
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
              {hostInstagramUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={hostInstagramUrl} target="_blank" rel="noopener noreferrer external">
                    <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    {hostProfile.instagram_username}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* About Me - only for non-hosts */}
          {!isHost && (profile?.bio || profile?.fun_fact) && (
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

          {/* Instagram Section - only for non-hosts */}
          {!isHost && profileInstagramUrl && (
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
                  <a href={profileInstagramUrl} target="_blank" rel="noopener noreferrer external">
                    View Profile
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Friends Section */}
          <div className="space-y-4 text-left">
            <button
              onClick={() => setShowFriends(!showFriends)}
              className="flex items-center gap-2 text-foreground font-bold text-lg w-full"
            >
              <Users className="h-5 w-5 text-primary" />
              Freunde
              <span className="text-muted-foreground text-sm font-normal ml-auto">
                {showFriends ? 'Ausblenden' : 'Anzeigen'}
              </span>
            </button>
            {showFriends && <FriendSearch />}
          </div>

          {!profile && (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground text-sm">Du hast noch kein Profil angelegt.</p>
              <p className="text-muted-foreground text-xs">Profil-Bearbeitung kommt bald!</p>
            </div>
          )}
        </div>
      </div>
      {user && (
        <ProfileStatsSheet
          open={statsSheet.open}
          onOpenChange={(open) => setStatsSheet((s) => ({ ...s, open }))}
          userId={user.id}
          activeTab={statsSheet.tab}
        />
      )}
    </Layout>
  );
};

export default Profile;