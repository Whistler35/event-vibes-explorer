import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, X, Check } from "lucide-react";
import { getActivityFontClass } from "@/lib/blitzText";
import { asBlitzQuestion } from "@/lib/utils";
import { toast } from "sonner";

interface PublicBlitzPreview {
  id: string;
  activity: string;
  city: string | null;
  host_name: string | null;
  host_avatar_url: string | null;
  is_active: boolean;
}

/**
 * Public, unauthenticated preview for a Blitz share link (WhatsApp,
 * Instagram DM, SMS, ...) — no login required to view. Only safe fields are
 * exposed (see get_public_blitz_preview in the DB, no exact location or
 * participant list). Mirrors the real swipe-card look so it reads as "this is
 * the app" rather than a generic landing page; tapping either action button
 * (like swiping) is where the account requirement kicks in, same as
 * commenting on an Instagram video shared outside the app.
 */
const SharedBlitz = () => {
  const { blitzId } = useParams<{ blitzId: string }>();
  const navigate = useNavigate();

  const { data: blitz, isLoading, isError } = useQuery({
    queryKey: ["public-blitz-preview", blitzId],
    enabled: !!blitzId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_blitz_preview" as any, {
        p_blitz_id: blitzId,
      });
      if (error) throw error;
      const row = (data as PublicBlitzPreview[] | null)?.[0];
      return row ?? null;
    },
  });

  const goToAuth = () => {
    navigate("/auth", { state: { mode: "signup" } });
  };

  const handleAction = () => {
    toast("Melde dich an, um mitzumachen ⚡", {
      description: "Registrierung dauert nur ein paar Sekunden.",
      action: { label: "Los geht's", onClick: goToAuth },
    });
  };

  const fontClass = blitz ? getActivityFontClass(blitz.activity) : "";

  return (
    <div
      className="min-h-screen bg-[hsl(var(--blitz-forest))] flex items-center justify-center p-4"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-sm">
        {isLoading && (
          <p className="text-white/60 text-sm text-center py-20">Lädt…</p>
        )}

        {!isLoading && (isError || !blitz) && (
          <div className="space-y-3 text-center py-20 px-4">
            <p className="text-xl font-black text-white">Dieser Blitz ist nicht (mehr) verfügbar.</p>
            <p className="text-white/60 text-sm">
              Der Link ist entweder abgelaufen oder der Blitz wurde beendet.
            </p>
            <button
              onClick={goToAuth}
              className="mt-6 text-[hsl(var(--bolt))] text-sm font-bold hover:underline"
            >
              Zu EVENDLE →
            </button>
          </div>
        )}

        {!isLoading && blitz && (
          <>
            {/* Swipe-card look-alike, no drag — tapping an action prompts sign-up */}
            <div className="relative w-full aspect-[3/4.3] overflow-hidden rounded-[28px] bg-[hsl(var(--blitz-forest))] text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] border border-white/10">
              <div className="absolute top-5 left-5 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-xs font-black">
                <div className="w-4 h-4 rounded-full bg-[hsl(var(--bolt))] flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-[hsl(var(--blitz-forest))] fill-current" />
                </div>
                EVENDLE
              </div>

              <div className="absolute top-5 right-5 z-20 inline-flex items-center px-3 py-1.5 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-[10px] font-black uppercase tracking-[0.1em]">
                {blitz.is_active ? "Live" : "Beendet"}
              </div>

              <div className="relative z-10 flex flex-col h-full pt-24 pb-28 px-8 items-center text-center">
                <div className="w-28 h-28 rounded-3xl bg-[hsl(var(--blitz-forest-deep))]/60 flex items-center justify-center mb-8">
                  <Zap className="w-14 h-14 text-[hsl(var(--bolt))]" strokeWidth={2} />
                </div>

                <h1 className={`${fontClass} text-4xl font-black leading-[0.95] tracking-tight break-words max-w-full`}>
                  {asBlitzQuestion(blitz.activity)}
                </h1>

                <div className="mt-8 flex items-center gap-2 text-white/85">
                  <Avatar className="w-8 h-8 border border-white/20">
                    <AvatarImage src={blitz.host_avatar_url ?? undefined} />
                    <AvatarFallback className="bg-[hsl(var(--blitz-forest-deep))] text-white text-[10px] font-black">
                      {blitz.host_name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm">
                    <span className="font-black">{blitz.host_name?.split(" ")[0] ?? "Jemand"}</span>{" "}
                    <span className="text-white/60">is hosting</span>
                  </p>
                </div>

                {blitz.city && <p className="mt-2 text-white/60 text-sm">{blitz.city}</p>}
              </div>

              {/* Action row — mirrors swipe left/right, but always prompts sign-up */}
              <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-6">
                <button
                  onClick={handleAction}
                  aria-label="Nicht dabei"
                  className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/20 backdrop-blur-sm transition active:scale-95"
                >
                  <X className="w-6 h-6 text-white/80" />
                </button>
                <button
                  onClick={handleAction}
                  aria-label="Dabei"
                  className="w-16 h-16 rounded-full bg-[hsl(var(--bolt))] hover:bg-[hsl(var(--bolt))]/90 flex items-center justify-center shadow-[0_10px_25px_-6px_rgba(0,0,0,0.4)] transition active:scale-95"
                >
                  <Check className="w-7 h-7 text-[hsl(var(--blitz-forest))]" strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="text-center mt-6 space-y-2">
              <button
                onClick={goToAuth}
                className="text-[hsl(var(--bolt))] text-sm font-black hover:underline"
              >
                Registrieren & mitmachen
              </button>
              <p className="text-white/40 text-xs">
                Schon einen Account?{" "}
                <button onClick={() => navigate("/auth", { state: { mode: "login" } })} className="underline hover:text-white/60">
                  Anmelden
                </button>
              </p>
            </div>
          </>
        )}

        <p className="text-white/40 text-xs text-center pt-8">
          be offline. · Spontan Leute treffen, jetzt
        </p>
      </div>
    </div>
  );
};

export default SharedBlitz;
