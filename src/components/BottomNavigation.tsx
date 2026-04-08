import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Calendar, User, ShieldCheck, MessageCircle, Building2 } from "lucide-react";
import { usePendingEventsCount } from "@/hooks/usePendingEventsCount";
import { useUnreadDMCount } from "@/hooks/useUnreadDMCount";
import { useIsHost } from "@/hooks/useIsHost";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, count: pendingCount } = usePendingEventsCount();
  const { unreadCount } = useUnreadDMCount();
  const { isHost } = useIsHost();

  const navItems = [
    { id: "events", label: "Events", icon: Calendar, path: "/" },
    { id: "nearby", label: "near by", icon: MapPin, path: "/nearby" },
    { id: "messenger", label: "Chat", icon: MessageCircle, path: "/messenger" },
    ...(isHost ? [{ id: "host", label: "Host", icon: Building2, path: "/host/dashboard" }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck, path: "/admin/events" }] : []),
    { id: "profile", label: "profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-bottom">
      <div className="flex justify-around items-center py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center space-y-1 transition-colors duration-200"
            >
              <div className={`relative p-3 rounded-full ${
                isActive 
                  ? 'bg-primary' 
                  : 'bg-transparent'
              }`}>
                <Icon 
                  size={24} 
                  className={
                    isActive 
                      ? 'text-primary-foreground' 
                      : 'text-muted-foreground'
                  } 
                />
                {item.id === "admin" && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
                {item.id === "messenger" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
