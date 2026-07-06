import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Snapchat-style landing for logged-out users.
 * Full-screen forest background, big white bolt, LOG IN / SIGN UP buttons at the bottom.
 */
const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[hsl(var(--blitz-forest))] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Center: bolt + wordmark */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="relative w-32 h-32 rounded-full bg-white/10 flex items-center justify-center animate-blitz-pulse">
          <Zap className="w-20 h-20 text-white fill-white" strokeWidth={2} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60 font-bold">EVENDLE</p>
          <h1 className="text-5xl font-black uppercase leading-none tracking-tight">Blitz</h1>
          <p className="text-white/70 text-base max-w-xs mx-auto pt-2">
            {t("blitz.teaser", "Spontan. In deiner Nähe. Jetzt.")}
          </p>
        </div>
      </div>

      {/* Bottom: LOG IN / SIGN UP */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={() => navigate("/auth?mode=login")}
          className="w-full py-4 rounded-full bg-white text-[hsl(var(--blitz-forest))] font-black text-lg uppercase tracking-wider shadow-lg active:scale-[0.98] transition"
        >
          Log In
        </button>
        <button
          onClick={() => navigate("/auth?mode=signup")}
          className="w-full py-4 rounded-full bg-transparent border-2 border-white text-white font-black text-lg uppercase tracking-wider active:scale-[0.98] transition"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Landing;
