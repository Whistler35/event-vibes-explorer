import { useEffect, useState } from "react";
import evendleLogo from "@/assets/evendle-logo.jpeg";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ShieldCheck, LogIn, Building2, Globe, ExternalLink, Ticket, Zap, ThumbsUp, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePendingEventsCount } from "@/hooks/usePendingEventsCount";
import { useIsHost } from "@/hooks/useIsHost";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FriendSearch from "@/components/FriendSearch";
import ProfileStatsSheet from "@/components/ProfileStatsSheet";
import HostRating from "@/components/HostRating";
import { Badge } from "@/components/ui/badge";
import { getInstagramUrl } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import InterestChips from "@/components/profile/InterestChips";
import PhotoStrip from "@/components/profile/PhotoStrip";
import FriendsCarousel from "@/components/profile/FriendsCarousel";
import RecentActivities from "@/components/profile/RecentActivities";
import { useTranslation } from "react-i18next";

interface ProfileData {
  name: string;
  age: number | null;
  country: string | null;
  bio: string | null;
  fun_fact: string | null;
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

interface Stats {
  friendsCount: number;
  hostedCount: number;
  participatedCount: number;
  blitzSent: number;
}

const useActivityLevel = () => {
  const { t } = useTranslation();
  return (score: number) => {
    if (score >= 20) return t("profile.activityHigh");
    if (score >= 5) return t("profile.activityMid");
    return t("profile.activityLow");
  };
};

const Profile = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const activityLevel = useActivityLevel();
  const { isAdmin, count: pendingCount } = usePendingEventsCount();
  const { isHost } = useIsHost();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFriendsSheet, setShowFriendsSheet] = useState(false);
  const [statsSheet, setStatsSheet] = useState<{ open: boolean; tab: "hosted" | "participated" | "friends" }>({ open: false, tab: "hosted" });
  const [stats, setStats] = useState<Stats>({ friendsCount: 0, hostedCount: 0, participatedCount: 0, blitzSent: 0 });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, age, country, bio, fun_fact, avatar_url, instagram_username, instagram_followers, interests, photos")
        .eq("user_id", user.id)
        .maybeSingle() as any;

      if (data) setProfile(data);

      const { data: hostData } = await supabase
        .from("host_profiles")
        .select("company_name, website_url, instagram_username, is_verified")
        .eq("user_id", user.id)
        .maybeSingle() as any;
      if (hostData) setHostProfile(hostData);

      const [friendsRes, hostedRes, participatedRes, blitzRes] = await Promise.all([
        supabase.from("friendships").select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("event_participants").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("blitz_requests").select("id", { count: "exact", head: true }).eq("host_id", user.id),
      ]);

      setStats({
        friendsCount: friendsRes.count || 0,
        hostedCount: hostedRes.count || 0,
        participatedCount: participatedRes.count || 0,
        blitzSent: blitzRes.count || 0,
      });

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("profile.loggedOut"));
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
            <h2 className="text-foreground text-xl font-bold">{t("profile.notLoggedIn")}</h2>
            <p className="text-muted-foreground text-sm">{t("profile.notLoggedInSub")}</p>
          </div>
          <Button onClick={() => navigate("/auth")} className="w-full max-w-xs">
            {t("profile.signIn")}
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <p className="text-muted-foreground">{t("profile.loading")}</p>
        </div>
      </Layout>
    );
  }

  const displayName = profile?.name || user.email?.split("@")[0] || "User";
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff2d78&color=fff&size=400`;
  const hostInstagramUrl = getInstagramUrl(hostProfile?.instagram_username);
  const profileInstagramUrl = getInstagramUrl(profile?.instagram_username);
  const photos = profile?.photos || [];
  const interests = profile?.interests || [];
  const score = stats.blitzSent + stats.participatedCount;
  const level = activityLevel(score);

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="max-w-md mx-auto p-5 space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain rounded-md" />
              <span className="text-foreground text-xl font-black">EVENDLE</span>
            </div>
            <div className="flex space-x-1">
              {isHost && (
                <Button variant="ghost" size="icon" className="text-[hsl(var(--blitz-forest))]" onClick={() => navigate("/host/dashboard")}>
                  <Building2 className="w-5 h-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="text-[hsl(var(--blitz-forest))]" onClick={() => navigate("/tickets")} title={t("profile.myTickets")}>
                <Ticket className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => navigate("/profile/edit")}>
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin/events")}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-[hsl(var(--blitz-pink))] text-white hover:opacity-95 transition shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{t("profile.adminArea")}</p>
                  <p className="text-xs opacity-90">{t("profile.adminAreaSub")}</p>
                </div>
              </div>
              {pendingCount > 0 && (
                <span className="bg-white text-[hsl(var(--blitz-pink))] text-xs font-bold rounded-full min-w-6 h-6 px-2 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {isHost ? (
            // Host profile - keeps prior layout
            <div className="text-center space-y-6">
              <div className="w-40 h-40 mx-auto rounded-full overflow-hidden ring-4 ring-primary">
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-foreground text-2xl font-bold">{displayName}</h1>
                  {hostProfile?.is_verified && <ShieldCheck className="w-5 h-5 text-primary" />}
                </div>
                {hostProfile?.company_name && (
                  <p className="text-muted-foreground text-sm">{hostProfile.company_name}</p>
                )}
                <Badge variant="secondary" className="text-xs mt-1">
                  <Building2 className="w-3 h-3 mr-1" />
                  Professional Host
                </Badge>
              </div>
              <div className="flex justify-center gap-8">
                <button onClick={() => setStatsSheet({ open: true, tab: "hosted" })} className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.hostedCount}</p>
                  <p className="text-muted-foreground text-xs">{t("profile.hosted")}</p>
                </button>
                <div className="text-center">
                  <HostRating hostUserId={user.id} size="sm" />
                </div>
                <button onClick={() => setStatsSheet({ open: true, tab: "friends" })} className="text-center">
                  <p className="text-foreground text-xl font-bold">{stats.friendsCount}</p>
                  <p className="text-muted-foreground text-xs">{t("profile.friends")}</p>
                </button>
              </div>
              {(hostProfile?.website_url || hostInstagramUrl) && (
                <div className="flex flex-wrap justify-center gap-3">
                  {hostProfile?.website_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={hostProfile.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4 mr-1.5" /> Website <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                  {hostInstagramUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={hostInstagramUrl} target="_blank" rel="noopener noreferrer external">
                        Instagram <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Immersive header */}
              <div className="flex flex-col items-center text-center pt-2">
                <div className="relative">
                  <div className="absolute inset-0 -m-6 profile-avatar-halo rounded-full" />
                  <div className="relative w-40 h-40 rounded-full overflow-hidden ring-4 ring-[hsl(var(--blitz-pink))] shadow-[0_20px_40px_-10px_rgba(255,45,120,0.45)]">
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  </div>
                </div>

                <h1 className="text-white text-3xl font-extrabold mt-5 tracking-tight">
                  {displayName}
                </h1>
                <p className="text-[hsl(var(--blitz-pink))] font-semibold text-sm mt-1">
                  {t("profile.blitzReady")}
                </p>
              </div>

              {/* Photo strip */}
              <PhotoStrip
                userId={user.id}
                photos={photos}
                editable
                onChange={(next) => setProfile((p) => (p ? { ...p, photos: next } : p))}
              />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => navigate("/blitz")}
                  className="blitz-stat-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center"
                >
                  <div className="w-11 h-11 rounded-full bg-[hsl(var(--blitz-pink))] text-white flex items-center justify-center font-extrabold text-lg shadow-lg">
                    {stats.blitzSent}
                  </div>
                  <p className="text-white/85 text-[11px] font-semibold leading-tight">{t("profile.blitzSent")} ⚡</p>
                </button>
                <button
                  onClick={() => setStatsSheet({ open: true, tab: "participated" })}
                  className="blitz-stat-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center"
                >
                  <div className="w-11 h-11 rounded-full bg-[hsl(var(--blitz-pink))] text-white flex items-center justify-center font-extrabold text-lg shadow-lg">
                    {stats.participatedCount}
                  </div>
                  <p className="text-white/85 text-[11px] font-semibold leading-tight">{t("profile.participated")} <ThumbsUp className="inline w-3 h-3 -mt-0.5" /></p>
                </button>
                <div className="blitz-stat-card rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center">
                  <div className="w-11 h-11 rounded-full bg-[hsl(var(--blitz-pink))] text-white flex items-center justify-center shadow-lg">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <p className="text-white/85 text-[11px] font-semibold leading-tight">
                    {t("profile.activity")}: {level} <Flame className="inline w-3 h-3 -mt-0.5 text-orange-400" />
                  </p>
                </div>
              </div>

              {/* About / Interests */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-lg">{t("profile.whatIDo")}</h3>
                  <button onClick={() => navigate("/profile/edit")} className="text-white/60 text-xs underline">{t("profile.edit")}</button>
                </div>
                <InterestChips interests={interests} onEdit={() => navigate("/profile/edit")} />
                {profile?.bio && (
                  <p className="text-white/75 text-sm leading-relaxed">{profile.bio}</p>
                )}
              </div>

              {/* Fun-fact sticker */}
              {profile?.fun_fact && (
                <div className="flex justify-center pt-2">
                  <div className="fun-fact-sticker rounded-2xl px-5 py-4 max-w-[88%]">
                    <p className="text-[hsl(var(--blitz-pink))] font-extrabold text-sm uppercase tracking-wider">
                      {t("profile.funFact")}
                    </p>
                    <p className="text-[#2a1a00] font-semibold mt-1 text-base leading-snug">
                      {profile.fun_fact}
                    </p>
                    <p className="text-2xl mt-1">😄</p>
                  </div>
                </div>
              )}

              {/* Friends carousel */}
              <FriendsCarousel userId={user.id} onAddFriend={() => setShowFriendsSheet(true)} />

              {/* Recent activities */}
              <RecentActivities userId={user.id} />

              {/* Instagram link if present */}
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
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{profile?.instagram_username}</p>
                        {profile?.instagram_followers && (
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
        userId={user.id}
        activeTab={statsSheet.tab}
      />

      <Sheet open={showFriendsSheet} onOpenChange={setShowFriendsSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{t("profile.findFriends")}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FriendSearch />
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default Profile;
