import { useNavigate, useLocation } from "react-router-dom";
import { User, MessageCircle, Zap, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUnreadDMCount } from "@/hooks/useUnreadDMCount";
import { useIncomingBlitzCount } from "@/hooks/useIncomingBlitzCount";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useUnreadDMCount();
  const { count: blitzIncoming } = useIncomingBlitzCount();

  const isActive = (p: string) =>
    location.pathname === p || location.pathname.startsWith(p + "/");

  const activeBlitz = isActive("/blitz");

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="mx-auto max-w-md px-5">
        <div className="pointer-events-auto relative bg-white rounded-full shadow-[0_10px_30px_-8px_rgba(15,20,16,0.18)] flex items-center justify-between px-5 py-2.5">
          {/* Feed left-outer */}
          <button
            onClick={() => navigate("/feed")}
            className="flex flex-col items-center gap-0.5 py-1.5 min-w-[52px]"
            aria-label={t("nav.feed")}
          >
            <Camera
              size={24}
              strokeWidth={1.8}
              className={
                isActive("/feed") ? "text-[hsl(var(--blitz-forest))]" : "text-[hsl(var(--blitz-forest))]/80"
              }
            />
            <span className="text-[11px] font-semibold text-[hsl(var(--blitz-forest))]">
              {t("nav.feed")}
            </span>
          </button>

          {/* Chat left-inner */}
          <button
            onClick={() => navigate("/messenger")}
            className="flex flex-col items-center gap-0.5 py-1.5 min-w-[52px]"
            aria-label={t("nav.chat")}
          >
            <div className="relative">
              <MessageCircle
                size={24}
                strokeWidth={1.8}
                className={
                  isActive("/messenger")
                    ? "text-[hsl(var(--blitz-forest))]"
                    : "text-[hsl(var(--blitz-forest))]/80"
                }
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))] text-[10px] font-black flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-[hsl(var(--blitz-forest))]">
              {t("nav.chat")}
            </span>
          </button>

          {/* Blitz center — lime disc lifted above the pill */}
          <button
            onClick={() => navigate("/blitz")}
            className="flex flex-col items-center gap-1 -mt-8"
            aria-label="BLITZ"
          >
            <div
              className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                activeBlitz
                  ? "bg-[hsl(var(--blitz-forest))] ring-4 ring-[hsl(var(--bolt))] shadow-[0_10px_30px_-6px_hsl(var(--bolt)/0.55)]"
                  : "bg-[hsl(var(--bolt))] shadow-[0_10px_30px_-6px_hsl(var(--bolt)/0.65)] animate-blitz-pulse"
              }`}
            >
              <Zap
                size={30}
                strokeWidth={2.5}
                className={
                  activeBlitz
                    ? "text-[hsl(var(--bolt))] fill-[hsl(var(--bolt))]"
                    : "text-[hsl(var(--blitz-forest))] fill-[hsl(var(--blitz-forest))]"
                }
              />
              {blitzIncoming > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-white text-[hsl(var(--blitz-forest))] text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-[hsl(var(--blitz-forest))]">
                  {blitzIncoming > 9 ? "9+" : blitzIncoming}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black tracking-[0.25em] text-[hsl(var(--blitz-forest))] pt-0.5">
              {t("nav.blitz")}
            </span>
          </button>

          {/* Profile right-outer */}
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center gap-0.5 py-1.5 min-w-[52px]"
            aria-label={t("nav.profile")}
          >
            <User
              size={24}
              strokeWidth={1.8}
              className={
                isActive("/profile")
                  ? "text-[hsl(var(--blitz-forest))]"
                  : "text-[hsl(var(--blitz-forest))]/80"
              }
            />
            <span className="text-[11px] font-semibold text-[hsl(var(--blitz-forest))]">
              {t("nav.profile")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
