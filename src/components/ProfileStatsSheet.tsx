import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, MapPin } from "lucide-react";

type Tab = "hosted" | "participated" | "friends";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  activeTab: Tab;
}

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  location_name: string;
  image_url: string | null;
}

interface FriendItem {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

const ProfileStatsSheet = ({ open, onOpenChange, userId, activeTab }: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(activeTab);
  const [hostedEvents, setHostedEvents] = useState<EventItem[]>([]);
  const [participatedEvents, setParticipatedEvents] = useState<EventItem[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);

    const fetchData = async () => {
      // Hosted events
      const { data: hosted } = await supabase
        .from("events")
        .select("id, title, event_date, location_name, image_url")
        .eq("created_by", userId)
        .order("event_date", { ascending: false })
        .limit(50);
      setHostedEvents((hosted as EventItem[]) || []);

      // Participated events
      const { data: parts } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq("user_id", userId);
      if (parts && parts.length > 0) {
        const ids = parts.map((p) => p.event_id);
        const { data: events } = await supabase
          .from("events")
          .select("id, title, event_date, location_name, image_url")
          .in("id", ids)
          .order("event_date", { ascending: false });
        setParticipatedEvents((events as EventItem[]) || []);
      } else {
        setParticipatedEvents([]);
      }

      // Friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map((f) =>
          f.requester_id === userId ? f.addressee_id : f.requester_id
        );
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", friendIds);
        setFriends((profiles as FriendItem[]) || []);
      } else {
        setFriends([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [open, userId]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "hosted", label: "Gehostet" },
    { key: "participated", label: "Teilgenommen" },
    { key: "friends", label: "Freunde" },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

  const getAvatar = (name: string, url: string | null) =>
    url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff5722&color=fff&size=100`;

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const renderEventCard = (event: EventItem) => (
    <button
      key={event.id}
      onClick={() => handleNavigate(`/event/${event.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-card/80 transition-colors"
    >
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-sm truncate">{event.title}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs">{formatDate(event.event_date)}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground text-xs truncate">{event.location_name}</span>
        </div>
      </div>
    </button>
  );

  const renderFriend = (friend: FriendItem) => (
    <button
      key={friend.user_id}
      onClick={() => handleNavigate(`/user/${friend.user_id}`)}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-card/80 transition-colors"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        <img src={getAvatar(friend.name, friend.avatar_url)} alt={friend.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-foreground font-semibold text-sm">{friend.name}</p>
    </button>
  );

  const currentList = tab === "hosted" ? hostedEvents : tab === "participated" ? participatedEvents : friends;
  const emptyText = tab === "friends" ? "Noch keine Freunde" : "Noch keine Events";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="sr-only">Statistiken</SheetTitle>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(75vh-80px)] px-4 pt-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Laden...</p>
          ) : currentList.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">{emptyText}</p>
          ) : (
            <div className="space-y-1 pb-4">
              {tab === "friends"
                ? friends.map(renderFriend)
                : (tab === "hosted" ? hostedEvents : participatedEvents).map(renderEventCard)}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileStatsSheet;
