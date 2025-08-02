import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Calendar, MessageCircle, User, Plus } from "lucide-react";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: "events", label: "Events", icon: Calendar, path: "/" },
    { id: "nearby", label: "near by", icon: MapPin, path: "/nearby" },
    { id: "home", label: "", icon: Plus, path: "/", isHome: true },
    { id: "messenger", label: "messenger", icon: MessageCircle, path: "/messenger" },
    { id: "profile", label: "profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
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
              <div className={`p-3 rounded-full ${
                item.isHome 
                  ? 'bg-evendle-orange' 
                  : isActive 
                    ? 'bg-evendle-orange' 
                    : 'bg-transparent'
              }`}>
                <Icon 
                  size={24} 
                  className={
                    item.isHome 
                      ? 'text-white' 
                      : isActive 
                        ? 'text-white' 
                        : 'text-evendle-gray'
                  } 
                />
              </div>
              <span className={`text-xs ${isActive ? 'text-evendle-orange' : 'text-evendle-gray'}`}>
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