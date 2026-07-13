import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { loading } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Avoid any onboarding/other-page flash while auth is still resolving.
  if (loading) {
    return <div className="min-h-screen bg-[hsl(var(--blitz-forest))]" />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 bg-[hsl(var(--blitz-forest))] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative w-full max-w-sm text-center space-y-8">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[hsl(var(--bolt))]/20 blur-3xl pointer-events-none" />

        <p className="relative text-[11px] uppercase tracking-[0.35em] text-white/55 font-bold">
          EVENDLE
        </p>

        <div className="relative flex justify-center">
          <div className="w-24 h-24 rounded-full bg-[hsl(var(--blitz-forest-deep))]/60 flex items-center justify-center">
            <Zap className="w-12 h-12 text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))]" />
          </div>
        </div>

        <div className="relative space-y-3">
          <h1 className="text-6xl font-black leading-none tracking-tight">404</h1>
          <p className="text-white/70 text-base">{t("notFound.message")}</p>
        </div>

        <button
          onClick={() => navigate("/", { replace: true })}
          className="relative w-full py-4 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] font-black uppercase tracking-wider shadow-[0_12px_32px_-8px_hsl(var(--bolt)/0.6)] active:scale-[0.98] transition"
        >
          {t("notFound.back")}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
