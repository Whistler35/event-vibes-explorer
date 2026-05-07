import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Calendar, User, MessageCircle, Building2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUnreadDMCount } from "@/hooks/useUnreadDMCount";
import { useIsHost } from "@/hooks/useIsHost";
import { useIncomingBlitzCount } from "@/hooks/useIncomingBlitzCount";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useUnreadDMCount();
  const { isHost } = useIsHost();
  const { count: blitzIncoming } = useIncomingBlitzCount();

  const navItems = [
    { id: "events", label: t("nav.events"), icon: Calendar, path: "/" },
    { id: "nearby", label: t("nav.nearby"), icon: MapPin, path: "/nearby" },
    { id: "blitz", label: t("nav.blitz"), icon: Zap, path: "/blitz", isBlitz: true },
    { id: "messenger", label: t("nav.chat"), icon: MessageCircle, path: "/messenger" },
    ...(isHost ? [{ id: "host", label: t("nav.host"), icon: Building2, path: "/host/dashboard" }] : []),
    { id: "profile", label: t("nav.profile"), icon: User, path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/60 z-50 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-end py-2">
        {navItems.map((item: any) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isBlitz = item.isBlitz;

          if (isBlitz) {
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1"
                aria-label="BLITZ"
              >
                <div className={`relative -mt-5 p-3.5 rounded-full bg-[hsl(var(--blitz-pink))] ${
                  isActive
                    ? "shadow-[0_8px_28px_hsl(var(--blitz-pink)/0.65)] ring-4 ring-[hsl(var(--blitz-pink))]/25"
                    : "shadow-[0_6px_22px_hsl(var(--blitz-pink)/0.55)] animate-blitz-pulse"
                }`}>
                  <Icon size={22} className="text-white fill-white" strokeWidth={2.5} />
                  {blitzIncoming > 0 && (
                    <span className="absolute -top-1 -right-1 bg-white text-[hsl(var(--blitz-pink))] text-[10px] font-black rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center shadow-md ring-2 ring-[hsl(var(--blitz-pink))]">
                      {blitzIncoming > 9 ? "9+" : blitzIncoming}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold tracking-wide ${isActive ? "text-[hsl(var(--blitz-pink))]" : "text-[hsl(var(--blitz-pink))]/70"}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 transition-all"
            >
              <div className="relative p-1.5">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={`transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`}
                />
                {item.id === "messenger" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[hsl(var(--blitz-pink))] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-wide transition-all ${isActive ? 'text-primary font-bold' : 'text-muted-foreground/70 font-medium'}`}>
                {item.label}
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
