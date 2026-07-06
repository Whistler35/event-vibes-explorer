import { useNavigate, useLocation } from "react-router-dom";
import { User, MessageCircle, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUnreadDMCount } from "@/hooks/useUnreadDMCount";
import { useIncomingBlitzCount } from "@/hooks/useIncomingBlitzCount";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useUnreadDMCount();
  const { count: blitzIncoming } = useIncomingBlitzCount();

  const isActive = (p: string) => location.pathname === p || location.pathname.startsWith(p + "/");

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/60 z-50 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-end py-2 px-6">
        {/* Chat left */}
        <button
          onClick={() => navigate("/messenger")}
          className="flex flex-col items-center gap-0.5 px-3 py-1"
        >
          <div className="relative p-1.5">
            <MessageCircle
              size={24}
              strokeWidth={isActive("/messenger") ? 2.4 : 1.8}
              className={isActive("/messenger") ? "text-[hsl(var(--blitz-forest))]" : "text-muted-foreground/70"}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] tracking-wide ${isActive("/messenger") ? "text-[hsl(var(--blitz-forest))] font-bold" : "text-muted-foreground/70 font-medium"}`}>
            {t("nav.chat")}
          </span>
        </button>

        {/* Blitz center */}
        <button
          onClick={() => navigate("/blitz")}
          className="flex flex-col items-center gap-1"
          aria-label="BLITZ"
        >
          <div className={`relative -mt-5 p-3.5 rounded-full bg-[hsl(var(--blitz-forest))] ${
            isActive("/blitz")
              ? "shadow-[0_8px_28px_hsl(var(--blitz-forest)/0.55)] ring-4 ring-[hsl(var(--blitz-forest))]/25"
              : "shadow-[0_6px_22px_hsl(var(--blitz-forest)/0.45)] animate-blitz-pulse"
          }`}>
            <Zap size={22} className="text-white fill-white" strokeWidth={2.5} />
            {blitzIncoming > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-[hsl(var(--blitz-forest))] text-[10px] font-black rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center shadow-md ring-2 ring-[hsl(var(--blitz-forest))]">
                {blitzIncoming > 9 ? "9+" : blitzIncoming}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold tracking-wide ${isActive("/blitz") ? "text-[hsl(var(--blitz-forest))]" : "text-[hsl(var(--blitz-forest))]/70"}`}>
            {t("nav.blitz")}
          </span>
        </button>

        {/* Profile right */}
        <button
          onClick={() => navigate("/profile")}
          className="flex flex-col items-center gap-0.5 px-3 py-1"
        >
          <div className="p-1.5">
            <User
              size={24}
              strokeWidth={isActive("/profile") ? 2.4 : 1.8}
              className={isActive("/profile") ? "text-[hsl(var(--blitz-forest))]" : "text-muted-foreground/70"}
            />
          </div>
          <span className={`text-[10px] tracking-wide ${isActive("/profile") ? "text-[hsl(var(--blitz-forest))] font-bold" : "text-muted-foreground/70 font-medium"}`}>
            {t("nav.profile")}
          </span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;
