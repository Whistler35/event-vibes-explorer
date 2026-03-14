import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Calendar, Users } from "lucide-react";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case "new_dm": return <MessageCircle className="w-5 h-5 text-primary" />;
      case "friend_event_created": return <Calendar className="w-5 h-5 text-primary" />;
      case "friend_joined_event": return <Users className="w-5 h-5 text-primary" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const handleClick = (notif: AppNotification) => {
    if (!notif.is_read) markAsRead(notif.id);

    if (notif.type === "new_dm" && notif.data?.conversation_id) {
      navigate(`/dm/${notif.data.conversation_id}`);
    } else if ((notif.type === "friend_event_created" || notif.type === "friend_joined_event") && notif.data?.event_id) {
      navigate(`/event/${notif.data.event_id}`);
    }
    setOpen(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Jetzt";
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-card transition-colors">
          <Bell className="w-6 h-6 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-foreground">Benachrichtigungen</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-primary text-xs">
                Alle gelesen
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Keine Benachrichtigungen</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-card/50 ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${!notif.is_read ? "text-foreground font-semibold" : "text-foreground"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${!notif.is_read ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {notif.body}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationBell;
