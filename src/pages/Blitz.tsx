import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveBlitzRequest } from "@/hooks/useBlitzRequest";
import { useMyBlitzMatches } from "@/hooks/useBlitzMatching";
import CreateBlitzModal from "@/components/blitz/CreateBlitzModal";
import ActiveBlitzScreen from "@/components/blitz/ActiveBlitzScreen";
import DiscoveryDeck from "@/components/blitz/DiscoveryDeck";
import IncomingRequestsList from "@/components/blitz/IncomingRequestsList";
import MyMatchesBanner from "@/components/blitz/MyMatchesBanner";
import MyPendingSwipesList from "@/components/blitz/MyPendingSwipesList";
import { toast } from "sonner";

type Tab = "request" | "discover";

const Blitz = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { request, loading, reload } = useActiveBlitzRequest();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("request");
  const [city, setCity] = useState<string | null>(null);
  const { matches } = useMyBlitzMatches();
  const seenMatchIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("evendle.selectedCity") ||
        localStorage.getItem("evendle_selected_city");
      if (stored) setCity(stored);
    } catch {}
  }, []);

  // Auto-navigate to brand-new matches where the current user is the participant
  useEffect(() => {
    if (!user) return;
    if (matches.length === 0) return;
    if (seenMatchIds.current.size === 0 && matches.length > 0) {
      matches.forEach((m) => seenMatchIds.current.add(m.id));
      return;
    }
    const fresh = matches.find(
      (m) => !seenMatchIds.current.has(m.id) && m.participant_id === user.id
    );
    if (fresh) {
      seenMatchIds.current.add(fresh.id);
      toast(t('blitz.matchToast'), { description: t('blitz.matchAccepted', { name: fresh.other_name ?? t('blitz.someone') }) });
      navigate(`/blitz/match/${fresh.id}`);
    } else {
      matches.forEach((m) => seenMatchIds.current.add(m.id));
    }
  }, [matches, user, navigate]);

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
              className="relative px-8 py-4 rounded-2xl bg-[hsl(var(--blitz-pink))] text-white font-black uppercase tracking-wider shadow-[0_8px_32px_hsl(var(--blitz-pink)/0.5)] hover:scale-105 transition"
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
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 pt-4 space-y-4">
        {/* Tab Switcher */}
        <div className="flex p-1 rounded-full bg-muted">
          <button
            onClick={() => setTab("request")}
            className={`flex-1 py-2.5 rounded-full text-sm font-black uppercase tracking-wider transition ${
              tab === "request"
                ? "bg-[hsl(var(--blitz-forest))] text-white shadow-md"
                : "text-muted-foreground"
            }`}
          >
            {t('blitz.myBlitz')}
          </button>
          <button
            onClick={() => setTab("discover")}
            className={`flex-1 py-2.5 rounded-full text-sm font-black uppercase tracking-wider transition ${
              tab === "discover"
                ? "bg-[hsl(var(--blitz-pink))] text-white shadow-md"
                : "text-muted-foreground"
            }`}
          >
            {t('blitz.discover')}
          </button>
        </div>

        <MyMatchesBanner />
        <MyPendingSwipesList />

        {tab === "request" ? (
          loading ? (
            <div className="h-[70vh] rounded-3xl bg-muted animate-pulse" />
          ) : request ? (
            <div className="space-y-4">
              <IncomingRequestsList blitzRequestId={request.id} />
              <ActiveBlitzScreen request={request} onEnded={reload} />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--blitz-forest))] text-white p-8 min-h-[65vh] flex flex-col items-center justify-between text-center">
              <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-30" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-[hsl(var(--blitz-pink))] blur-3xl opacity-25" />

              <div className="relative pt-6 space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60 font-bold">{t('blitz.tagline')}</p>
                <h1 className="text-5xl font-black uppercase leading-none whitespace-pre-line">
                  {t('blitz.spontaneousFeeling')}
                </h1>
                <p className="text-white/70 mt-3 max-w-xs mx-auto">
                  {t('blitz.teaserAlt')}
                </p>
              </div>

              <button
                onClick={() => setCreateOpen(true)}
                className="relative w-32 h-32 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_60px_hsl(var(--blitz-pink)/0.6)] hover:scale-105 active:scale-95 transition animate-blitz-pulse"
                aria-label={t('blitz.createNew')}
              >
                <Zap className="w-16 h-16 text-white fill-white" />
              </button>

              <p className="relative text-sm font-black uppercase tracking-[0.25em] pb-4">
                {t('blitz.tapToBlitz')}
              </p>
            </div>
          )
        ) : (
          <DiscoveryDeck city={city} />
        )}
      </div>

      <CreateBlitzModal open={createOpen} onOpenChange={setCreateOpen} onCreated={reload} />
      <BottomNavigation />
    </div>
  );
};

export default Blitz;
