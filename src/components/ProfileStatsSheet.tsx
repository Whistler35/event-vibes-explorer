import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, MapPin, CalendarDays } from "lucide-react";

type Tab = "sent" | "joined" | "friends";

interface BlitzItem {
  id: string;
  activity: string;
  city: string | null;
  created_at: string;
}

interface FriendItem {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  activeTab: Tab;
}

const ProfileStatsSheet = ({ open, onOpenChange, userId, activeTab }: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(activeTab);
  const [sent, setSent] = useState<BlitzItem[]>([]);
  const [joined, setJoined] = useState<BlitzItem[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);

    const fetchData = async () => {
      // Blitze, die ich gesendet habe
      const { data: sentData } = await supabase
        .from("blitz_requests")
        .select("id, activity, city, created_at")
        .eq("host_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setSent((sentData as BlitzItem[]) || []);

      // Blitze, bei denen ich mitgemacht habe
      const { data: parts } = await supabase
        .from("blitz_match_participants")
        .select("match_id")
        .eq("user_id", userId);
      const matchIds = (parts || []).map((p: any) => p.match_id);
      if (matchIds.length) {
        const { data: matches } = await supabase
          .from("blitz_matches")
          .select("blitz_request_id, created_at")
          .in("id", matchIds);
        const reqIds = Array.from(
          new Set((matches || []).map((m: any) => m.blitz_request_id).filter(Boolean))
        );
        if (reqIds.length) {
          const { data: reqs } = await supabase
            .from("blitz_requests")
            .select("id, activity, city, created_at")
            .in("id", reqIds)
            .order("created_at", { ascending: false });
          setJoined((reqs as BlitzItem[]) || []);
        } else {
          setJoined([]);
        }
      } else {
        setJoined([]);
      }

      // Freunde
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map((f: any) =>
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
    { key: "sent", label: "Gesendet" },
    { key: "joined", label: "Mitgemacht" },
    { key: "friends", label: "Freunde" },
  ];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

  const getAvatar = (name: string, url: string | null) =>
    url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1E3323&color=fff&size=100`;

  const renderBlitzCard = (b: BlitzItem) => (
    <div
      key={b.id}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
    >
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-[hsl(var(--blitz-forest))]/10 flex items-center justify-center">
        <Zap className="w-5 h-5 text-[hsl(var(--blitz-forest))]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-semibold text-sm truncate">{b.activity}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <CalendarDays className="w-3 h-3" />
            {formatDate(b.created_at)}
          </span>
          {b.city && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs truncate">
              <MapPin className="w-3 h-3" />
              {b.city}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const renderFriend = (friend: FriendItem) => (
    <button
      key={friend.user_id}
      onClick={() => {
        onOpenChange(false);
        navigate(`/user/${friend.user_id}`);
      }}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left hover:bg-card/80 transition-colors"
    >
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
        <img src={getAvatar(friend.name, friend.avatar_url)} alt={friend.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-foreground font-semibold text-sm">{friend.name}</p>
    </button>
  );

  const emptyText =
    tab === "friends"
      ? "Noch keine Freunde"
      : tab === "sent"
        ? "Noch keine Blitze gesendet"
        : "Noch bei keinem Blitz mitgemacht";

  const currentEmpty =
    (tab === "sent" && sent.length === 0) ||
    (tab === "joined" && joined.length === 0) ||
    (tab === "friends" && friends.length === 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="sr-only">Blitz-Statistiken</SheetTitle>
          <div className="flex gap-2">
            {tabs.map((tt) => (
              <button
                key={tt.key}
                onClick={() => setTab(tt.key)}
                className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                  tab === tt.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
                }`}
              >
                {tt.label}
              </button>
            ))}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(75vh-80px)] px-4 pt-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Laden…</p>
          ) : currentEmpty ? (
            <p className="text-muted-foreground text-center py-8 text-sm">{emptyText}</p>
          ) : (
            <div className="space-y-1 pb-4">
              {tab === "friends"
                ? friends.map(renderFriend)
                : (tab === "sent" ? sent : joined).map(renderBlitzCard)}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileStatsSheet;
