import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MessageCircle, Building2, Globe, ExternalLink, ShieldCheck, UserPlus, UserCheck, UserMinus, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ProfileStatsSheet from "@/components/ProfileStatsSheet";
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

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfileData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hostedCount: 0, participatedCount: 0, friendsCount: 0 });
  const [statsSheet, setStatsSheet] = useState<{ open: boolean; tab: "hosted" | "participated" | "friends" }>({ open: false, tab: "hosted" });
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

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

  const fetchFriendship = useCallback(async () => {
    if (!user || !userId || userId === user.id) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();
    setFriendship(data as Friendship | null);
  }, [user, userId]);

  const sendFriendRequest = async () => {
    if (!user || !userId) return;
    setFriendActionLoading(true);
    const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: userId } as any);
    if (error) toast.error("Anfrage konnte nicht gesendet werden.");
    else toast.success("Freundschaftsanfrage gesendet!");
    await fetchFriendship();
    setFriendActionLoading(false);
  };

  const respondToRequest = async (status: "accepted" | "rejected") => {
    if (!friendship) return;
    setFriendActionLoading(true);
    const { error } = await supabase
      .from("friendships")
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", friendship.id);
    if (error) toast.error("Fehler beim Aktualisieren.");
    else toast.success(status === "accepted" ? "Freund hinzugefügt! 🎉" : "Anfrage abgelehnt.");
    await fetchFriendship();
    setFriendActionLoading(false);
  };

  const removeFriend = async () => {
    if (!friendship) return;
    setFriendActionLoading(true);
    const { error } = await supabase.from("friendships").delete().eq("id", friendship.id);
    if (error) toast.error("Fehler beim Entfernen.");
    else toast.success("Freund entfernt.");
    setFriendship(null);
    setFriendActionLoading(false);
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

      // Check if user is a host
      const { data: roleData } = await supabase
        .rpc('has_role', { _user_id: userId, _role: 'professional_host' });

      const userIsHost = roleData === true;
      setIsHost(userIsHost);

      if (userIsHost) {
        const { data: hostData } = await supabase
          .from("host_profiles")
          .select("company_name, website_url, instagram_username, is_verified")
          .eq("user_id", userId)
          .maybeSingle() as any;
        if (hostData) setHostProfile(hostData);
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
    fetchFriendship();
  }, [userId, fetchFriendship]);

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
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-primary">
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-foreground text-2xl font-bold">
                {displayName}{!isHost && profile.age ? `, ${profile.age}` : ""}
              </h2>
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

          {/* Friendship & Message Actions */}
          {user && userId !== user.id && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
              {/* Pending request received - show accept/reject */}
              {friendship?.status === "pending" && friendship.addressee_id === user.id && (
                <div className="w-full space-y-2">
                  <p className="text-sm text-muted-foreground">Möchte mit dir befreundet sein</p>
                  <div className="flex gap-2 w-full">
                    <Button
                      onClick={() => respondToRequest("accepted")}
                      disabled={friendActionLoading}
                      className="flex-1"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Annehmen
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => respondToRequest("rejected")}
                      disabled={friendActionLoading}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Ablehnen
                    </Button>
                  </div>
                </div>
              )}

              {/* Pending request sent */}
              {friendship?.status === "pending" && friendship.requester_id === user.id && (
                <Button variant="outline" disabled className="w-full">
                  <Clock className="w-4 h-4 mr-2" />
                  Anfrage gesendet
                </Button>
              )}

              {/* Already friends */}
              {friendship?.status === "accepted" && (
                <div className="flex gap-2 w-full">
                  <Button onClick={handleStartDM} className="flex-1">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Nachricht
                  </Button>
                  <Button variant="outline" onClick={removeFriend} disabled={friendActionLoading} className="text-destructive hover:text-destructive">
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* No friendship yet */}
              {!friendship && (
                <Button onClick={sendFriendRequest} disabled={friendActionLoading} className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Freund hinzufügen
                </Button>
              )}

              {/* Always show message option if friends */}
              {friendship?.status === "accepted" ? null : (
                <Button variant="ghost" onClick={handleStartDM} className="w-full text-muted-foreground">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Nachricht senden
                </Button>
              )}
            </div>
          )}

          {/* Host Links */}
          {isHost && (hostProfile?.website_url || hostProfile?.instagram_username) && (
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
              {hostProfile?.instagram_username && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.instagram.com/${hostProfile.instagram_username.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    {hostProfile.instagram_username}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* About Me - only for non-hosts */}
          {!isHost && (profile.bio || profile.fun_fact) && (
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
          {!isHost && profile.instagram_username && (
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
                  <a
                    href={`https://www.instagram.com/${profile.instagram_username.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Profile
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {userId && (
        <ProfileStatsSheet
          open={statsSheet.open}
          onOpenChange={(open) => setStatsSheet((s) => ({ ...s, open }))}
          userId={userId}
          activeTab={statsSheet.tab}
        />
      )}
    </Layout>
  );
};

export default UserProfile;