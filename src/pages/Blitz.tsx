import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveBlitzRequest } from "@/hooks/useBlitzRequest";
import { useMyBlitzMatches, type BlitzMatch } from "@/hooks/useBlitzMatching";
import CreateBlitzModal from "@/components/blitz/CreateBlitzModal";
import ActiveBlitzScreen from "@/components/blitz/ActiveBlitzScreen";
import DiscoveryDeck from "@/components/blitz/DiscoveryDeck";
import NotificationBell from "@/components/NotificationBell";
import IncomingRequestsList from "@/components/blitz/IncomingRequestsList";
import MyPendingSwipesList from "@/components/blitz/MyPendingSwipesList";
import MatchMoment from "@/components/blitz/MatchMoment";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type Tab = "request" | "discover";

const Blitz = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { request, loading, reload } = useActiveBlitzRequest();
  const [createOpen, setCreateOpen] = useState(false);
  // Default = Discovery mode (users open the app straight into discovering
  // blitzes), unless a notification tap requested a specific tab.
  const requestedTab = (location.state as { tab?: Tab } | null)?.tab;
  const [tab, setTab] = useState<Tab>(requestedTab ?? "discover");
  const [city, setCity] = useState<string | null>(null);
  const { matches } = useMyBlitzMatches();
  const seenMatchIds = useRef<Set<string>>(new Set());
  const [matchMoment, setMatchMoment] = useState<BlitzMatch | null>(null);

  // Fetch own profile once for the match moment avatars
  const { data: myProfile } = useQuery({
    queryKey: ["own-profile-mini", user?.id],
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

  // Also react when already mounted on /blitz and a notification tap comes
  // in with a fresh state (navigate() to the same path doesn't remount).
  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("evendle.selectedCity") ||
        localStorage.getItem("evendle_selected_city");
      if (stored) setCity(stored);
    } catch {}
  }, []);

  // Detect brand-new matches → show fullscreen Match Moment
  useEffect(() => {
    if (!user) return;
    if (matches.length === 0) return;
    if (seenMatchIds.current.size === 0 && matches.length > 0) {
      matches.forEach((m) => seenMatchIds.current.add(m.id));
      return;
    }
    const fresh = matches.find((m) => !seenMatchIds.current.has(m.id));
    if (fresh) {
      seenMatchIds.current.add(fresh.id);
      setMatchMoment(fresh);
    } else {
      matches.forEach((m) => seenMatchIds.current.add(m.id));
    }
  }, [matches, user]);

  // Logged-out teaser
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--blitz-forest))] text-white p-8 min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-40" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-30" />

            <div className="relative w-20 h-20 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_40px_hsl(var(--blitz-pink)/0.7)] animate-pulse">
              <Zap className="w-12 h-12 text-white fill-white" />
            </div>

            <div className="relative space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">{t('blitz.tagline')}</p>
              <h1 className="text-5xl font-black uppercase leading-none whitespace-pre-line">
                {t('blitz.spontaneousNow')}
              </h1>
              <p className="text-white/80 max-w-xs mx-auto text-base">
                {t('blitz.teaser')}
              </p>
            </div>

            <button
              onClick={() => navigate("/auth")}
              className="relative px-8 py-4 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] font-black uppercase tracking-wider shadow-[0_12px_32px_-8px_hsl(var(--bolt)/0.6)] hover:scale-105 transition"
            >
              {t('blitz.loginToBlitz')}
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] bg-background flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
    >
      <div className="max-w-md w-full mx-auto px-5 pt-5 flex-1 min-h-0 flex flex-col gap-4">
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[hsl(var(--blitz-forest))] text-lg font-black tracking-tight">EVENDLE</span>
          <NotificationBell />
        </div>

        {/* Segmented Control */}
        <div className="flex p-1 rounded-full bg-[hsl(var(--muted))] shrink-0">
          <button
            onClick={() => setTab("request")}
            className={`flex-1 py-3 rounded-full text-sm font-black uppercase tracking-[0.2em] transition ${
              tab === "request"
                ? "bg-[hsl(var(--blitz-forest))] text-white shadow-sm"
                : "text-[hsl(var(--blitz-forest))]/50"
            }`}
          >
            {t('blitz.myBlitz')}
          </button>
          <button
            onClick={() => setTab("discover")}
            className={`flex-1 py-3 rounded-full text-sm font-black uppercase tracking-[0.2em] transition ${
              tab === "discover"
                ? "bg-[hsl(var(--blitz-forest))] text-white shadow-sm"
                : "text-[hsl(var(--blitz-forest))]/50"
            }`}
          >
            {t('blitz.discover')}
          </button>
        </div>

        <div className="shrink-0 empty:hidden space-y-2">
          {matches.length > 0 && (
            <button
              onClick={() => navigate("/messenger")}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-full bg-[hsl(var(--blitz-forest))] text-white text-sm font-black shadow-[0_10px_24px_-10px_rgba(30,51,35,0.4)] active:scale-[0.99] transition"
            >
              <Zap className="w-4 h-4 fill-[hsl(var(--bolt))] text-[hsl(var(--bolt))] shrink-0" />
              <span className="flex-1 text-left">
                {matches.length === 1 ? "1 aktiver Huddle" : `${matches.length} aktive Huddles`}
              </span>
              <span className="text-[hsl(var(--bolt))]">→</span>
            </button>
          )}
          <MyPendingSwipesList />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "request" ? (
          loading ? (
            <div className="h-full min-h-[380px] rounded-[28px] bg-muted animate-pulse" />
          ) : request ? (
            <div className="space-y-4">
              <IncomingRequestsList blitzRequestId={request.id} />
              <ActiveBlitzScreen request={request} onEnded={reload} />
            </div>
          ) : (
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full h-full min-h-[380px] relative overflow-hidden rounded-[28px] bg-[hsl(var(--blitz-forest))] text-white p-8 flex flex-col items-center justify-between text-center active:scale-[0.99] transition"
              aria-label={t('blitz.createNew')}
            >
              <div className="pt-4 space-y-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-white/55 font-bold">
                  EVENDLE BLITZ
                </p>
                <h1 className="text-[44px] leading-[0.95] font-black uppercase tracking-tight whitespace-pre-line">
                  {t('blitz.spontaneousFeeling')}
                </h1>
                <p className="text-white/65 text-[15px] max-w-[280px] mx-auto leading-snug">
                  {t('blitz.teaserAlt')}
                </p>
              </div>

              <div className="relative flex items-center justify-center py-6">
                <Zap className="w-24 h-24 text-white fill-white drop-shadow-[0_8px_24px_rgba(212,242,106,0.35)]" />
              </div>

              <p className="text-[13px] font-black uppercase tracking-[0.4em] text-white/85 pb-2">
                {t('blitz.tapToBlitz')}
              </p>
            </button>
          )
        ) : (
          <DiscoveryDeck
            city={city}
            onStartOwn={() => {
              setTab("request");
              setCreateOpen(true);
            }}
          />
        )}
        </div>
      </div>

      <CreateBlitzModal open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />

      <MatchMoment
        open={!!matchMoment}
        activity={matchMoment?.activity}
        myName={myProfile?.name ?? null}
        myAvatar={myProfile?.avatar_url ?? null}
        otherName={matchMoment?.preview_names?.[0] ?? null}
        otherAvatar={matchMoment?.preview_avatars?.[0] ?? null}
        onOpenChat={() => {
          const id = matchMoment?.id;
          setMatchMoment(null);
          if (id) navigate(`/blitz/match/${id}`);
        }}
        onKeepSwiping={() => setMatchMoment(null)}
      />

      <BottomNavigation />
    </div>
  );
};

export default Blitz;
