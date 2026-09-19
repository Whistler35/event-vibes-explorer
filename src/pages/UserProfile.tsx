import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  MessageCircle,
  Building2,
  Globe,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  X,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ProfileStatsSheet from "@/components/ProfileStatsSheet";
import HostRating from "@/components/HostRating";
import { getInstagramUrl } from "@/lib/utils";
import UserActionsMenu from "@/components/moderation/UserActionsMenu";
import FriendsCarousel from "@/components/profile/FriendsCarousel";
import BlitzMomentsGrid from "@/components/profile/BlitzMomentsGrid";
import FriendSearch from "@/components/FriendSearch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ProfileData {
  name: string;
  age: number | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  instagram_username: string | null;
  instagram_followers: string | null;
  interests: string[] | null;
  photos: string[] | null;
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Landing on your own id here (e.g. tapping yourself in someone else's
  // friends list) used to render this whole page with its own, different
  // look — confusing, and the reason "my profile changed" reports kept
  // coming up. Your own profile should always be the canonical /profile.
  useEffect(() => {
    if (user && userId && user.id === userId) navigate("/profile", { replace: true });
  }, [user, userId, navigate]);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfileData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    friendsCount: 0,
    blitzSent: 0,
    blitzJoined: 0,
  });
  const [statsSheet, setStatsSheet] = useState<{
    open: boolean;
    tab: "sent" | "joined" | "friends";
  }>({ open: false, tab: "sent" });
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [showFriendsSheet, setShowFriendsSheet] = useState(false);

  const handleStartDM = async () => {
    if (!user || !userId) {
      toast.error(t("userProfile.loginToMessage"));
      return;
    }
    const { data, error } = await supabase.rpc("get_or_create_dm", {
      p_user1: user.id,
      p_user2: userId,
    });
    if (error) {
      toast.error(t("userProfile.chatCreateError"));
      return;
    }
    navigate(`/dm/${data}`);
  };

  const fetchFriendship = useCallback(async () => {
    if (!user || !userId || userId === user.id) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
      )
      .maybeSingle();
    setFriendship(data as Friendship | null);
  }, [user, userId]);

  const sendFriendRequest = async () => {
    if (!user || !userId) return;
    setFriendActionLoading(true);
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: userId } as any);
    if (error) toast.error(t("userProfile.friendRequestError"));
    else toast.success(t("userProfile.friendRequestSent"));
    await fetchFriendship();
    setFriendActionLoading(false);
  };

  const respondToRequest = async (status: "accepted" | "rejected") => {
    if (!friendship) return;
    setFriendActionLoading(true);
    if (status === "rejected") {
      // Reject = delete the row, so the requester can send a new request later
      const { error } = await supabase.from("friendships").delete().eq("id", friendship.id);
      if (error) toast.error(t("userProfile.updateError"));
      else toast.success(t("userProfile.requestRejected"));
    } else {
      const { error } = await supabase
        .from("friendships")
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", friendship.id);
      if (error) toast.error(t("userProfile.updateError"));
      else toast.success(t("userProfile.friendAdded"));
    }
    await fetchFriendship();
    setFriendActionLoading(false);
  };

  const removeFriend = async () => {
    if (!friendship) return;
    setFriendActionLoading(true);
    const { error } = await supabase.from("friendships").delete().eq("id", friendship.id);
    if (error) toast.error(t("userProfile.removeError"));
    else toast.success(t("userProfile.friendRemoved"));
    setFriendship(null);
    setFriendActionLoading(false);
  };

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "name, age, country, bio, avatar_url, instagram_username, instagram_followers, interests, photos"
        )
        .eq("user_id", userId)
        .maybeSingle() as any;

      if (data) setProfile(data);

      const { data: roleData } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "professional_host",
      });
      const userIsHost = roleData === true;
      setIsHost(userIsHost);

      if (userIsHost) {
        const { data: hostData } = (await supabase
          .from("host_profiles")
          .select("company_name, website_url, instagram_username, is_verified")
          .eq("user_id", userId)
          .maybeSingle()) as any;
        if (hostData) setHostProfile(hostData);
      }

      const [friendsRes, blitzRes, joinedRes] = await Promise.all([
        supabase
          .from("friendships")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase.from("blitz_requests").select("id", { count: "exact", head: true }).eq("host_id", userId),
        supabase.from("blitz_match_participants").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setStats({
        friendsCount: friendsRes.count || 0,
        blitzSent: blitzRes.count || 0,
        blitzJoined: joinedRes.count || 0,
      });

      setLoading(false);
    };

    fetchProfile();
    fetchFriendship();
  }, [userId, fetchFriendship]);

  if (loading || (user && userId && user.id === userId)) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">{t("userProfile.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (!profile || !userId) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
          <p className="text-muted-foreground">{t("userProfile.notFound")}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("userProfile.back")}
          </Button>
        </div>
      </Layout>
    );
  }

  const displayName = profile.name || "Unknown";
  const avatarUrl =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff2d78&color=fff&size=400`;
  const hostInstagramUrl = getInstagramUrl(hostProfile?.instagram_username);
  const profileInstagramUrl = getInstagramUrl(profile.instagram_username);
  const isOwnProfile = user?.id === userId;

  const friendActions = user && !isOwnProfile && (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      {friendship?.status === "pending" && friendship.addressee_id === user.id && (
        <div className="w-full space-y-2">
          <p className={`text-sm text-center ${isHost ? "text-muted-foreground" : "text-white/70"}`}>
            {t("userProfile.wantsToBeFriends")}
          </p>
          <div className="flex gap-2 w-full">
            <Button onClick={() => respondToRequest("accepted")} disabled={friendActionLoading} className="flex-1">
              <UserCheck className="w-4 h-4 mr-2" />
              {t("userProfile.accept")}
            </Button>
            <Button
              variant="outline"
              onClick={() => respondToRequest("rejected")}
              disabled={friendActionLoading}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              {t("userProfile.decline")}
            </Button>
          </div>
        </div>
      )}

      {friendship?.status === "pending" && friendship.requester_id === user.id && (
        <Button variant="outline" disabled className="w-full">
          <Clock className="w-4 h-4 mr-2" />
          Anfrage gesendet
        </Button>
      )}

      {friendship?.status === "accepted" && (
        <div className="flex gap-2 w-full">
          <Button onClick={handleStartDM} className="flex-1">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("userProfile.message")}
          </Button>
          <Button
            variant="outline"
            onClick={removeFriend}
            disabled={friendActionLoading}
            className="text-destructive hover:text-destructive"
          >
            <UserMinus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {!friendship && (
        <Button onClick={sendFriendRequest} disabled={friendActionLoading} className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          {t("userProfile.addFriend")}
        </Button>
      )}

      {friendship?.status !== "accepted" && (
        <Button
          variant="ghost"
          onClick={handleStartDM}
          className={`w-full ${isHost ? "text-muted-foreground" : "text-white/80 hover:text-white hover:bg-white/10"}`}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {t("userProfile.sendMessage")}
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className={`${isHost ? "" : "profile-blitz-bg min-h-screen"}`}>
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className={isHost ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white hover:bg-white/10"}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className={`${isHost ? "text-foreground" : "text-white"} text-xl font-bold`}>{t("userProfile.profile")}</h1>
            {user && !isOwnProfile && userId && (
              <div className="ml-auto">
                <UserActionsMenu
                  targetUserId={userId}
                  targetUserName={displayName}
                  context="profile"
                  className={
                    isHost
                      ? "w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                      : "w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10"
                  }
                />
              </div>
            )}
          </div>

          {isHost ? (
            // Host profile - classic layout
            <div className="text-center space-y-6">
              <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-primary">
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-foreground text-2xl font-bold">{displayName}</h2>
                  {hostProfile?.is_verified && <ShieldCheck className="w-5 h-5 text-primary" />}
                </div>
                {hostProfile?.company_name && (
                  <p className="text-muted-foreground text-sm">{hostProfile.company_name}</p>
                )}
                <Badge variant="secondary" className="text-xs mt-1">
                  <Building2 className="w-3 h-3 mr-1" />
                  {t("userProfile.professionalHost")}
                </Badge>
              </div>

              <div className="flex justify-center gap-8">
                <button onClick={() => setStatsSheet({ open: true, tab: "sent" })} className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.blitzSent}</p>
                  <p className="text-muted-foreground text-xs">Blitze</p>
                </button>
                <div className="text-center">
                  <HostRating hostUserId={userId} interactive={!!user && user.id !== userId} />
                </div>
                <button onClick={() => setStatsSheet({ open: true, tab: "friends" })} className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.friendsCount}</p>
                  <p className="text-muted-foreground text-xs">{t("userProfile.friends")}</p>
                </button>
              </div>
              {friendActions}
              {(hostProfile?.website_url || hostInstagramUrl) && (
                <div className="flex flex-wrap justify-center gap-3">
                  {hostProfile?.website_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={hostProfile.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4 mr-1.5" />
                        {t("userProfile.website")}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {hostInstagramUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={hostInstagramUrl} target="_blank" rel="noopener noreferrer external">
                        Instagram
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Header — same look as your own profile */}
              <div className="flex flex-col items-center text-center pt-2">
                <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-[hsl(var(--blitz-forest))] shadow-[0_20px_40px_-16px_rgba(30,51,35,0.35)]">
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                </div>

                <h1 className="text-foreground text-3xl font-black mt-5 tracking-tight">
                  {displayName}
                </h1>
                {profile.bio && (
                  <p className="text-white/85 text-sm leading-relaxed mt-3 max-w-sm">{profile.bio}</p>
                )}
              </div>

              {/* Friend / Message actions */}
              {friendActions}

              {/* Blitz Feed photos */}
              <BlitzMomentsGrid userId={userId} title={`${displayName.split(" ")[0]}s Blitz-Momente`} />

              {/* Stats — 3 dark cards, same style as your own profile */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-white/10 border border-white/10 p-4 flex flex-col items-center gap-1 text-center">
                  <p className="text-3xl font-black tabular-nums text-foreground leading-none">{stats.blitzSent}</p>
                  <p className="text-muted-foreground text-[11px] font-semibold leading-tight mt-1">{t("userProfile.blitzSent")}</p>
                </div>
                <button
                  onClick={() => setStatsSheet({ open: true, tab: "joined" })}
                  className="rounded-2xl bg-white/10 border border-white/10 p-4 flex flex-col items-center gap-1 text-center"
                >
                  <p className="text-3xl font-black tabular-nums text-foreground leading-none">{stats.blitzJoined}</p>
                  <p className="text-muted-foreground text-[11px] font-semibold leading-tight mt-1">
                    Mitgemacht <ThumbsUp className="inline w-3 h-3 -mt-0.5" />
                  </p>
                </button>
                <button
                  onClick={() => setStatsSheet({ open: true, tab: "friends" })}
                  className="rounded-2xl bg-white/10 border border-white/10 p-4 flex flex-col items-center gap-1 text-center"
                >
                  <p className="text-3xl font-black tabular-nums text-foreground leading-none">{stats.friendsCount}</p>
                  <p className="text-muted-foreground text-[11px] font-semibold leading-tight mt-1">{t("userProfile.friends")}</p>
                </button>
              </div>

              {/* Friends carousel */}
              <FriendsCarousel
                userId={userId}
                isOwnProfile={isOwnProfile}
                onAddFriend={() => setShowFriendsSheet(true)}
              />
{/* Instagram */}
              {profileInstagramUrl && (
                <a
                  href={profileInstagramUrl}
                  target="_blank"
                  rel="noopener noreferrer external"
                  className="block bg-white/5 border border-white/10 rounded-2xl p-3 hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img src={avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{profile.instagram_username}</p>
                        {profile.instagram_followers && (
                          <p className="text-white/60 text-xs">{profile.instagram_followers}</p>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-white/60" />
                  </div>
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <ProfileStatsSheet
        open={statsSheet.open}
        onOpenChange={(open) => setStatsSheet((s) => ({ ...s, open }))}
        userId={userId}
        activeTab={statsSheet.tab}
      />

      <Sheet open={showFriendsSheet} onOpenChange={setShowFriendsSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("profile.findFriends")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto h-[calc(80vh-64px)] pb-6">
            <FriendSearch />
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default UserProfile;
