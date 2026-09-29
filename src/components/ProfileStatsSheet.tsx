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

    // Direct RLS-scoped queries here only ever returned rows the CURRENT
    // viewer is personally party to — always right on your own profile, but
    // silently empty on anyone else's (the same class of bug as the stat
    // counts above it, see get_profile_stats). These RPCs return just the
    // fields already shown here, safe regardless of viewer relationship.
    const fetchData = async () => {
      const { data: sentData } = await supabase.rpc("get_profile_blitz_list" as any, {
        p_user_id: userId,
        p_kind: "sent",
      });
      setSent((sentData as BlitzItem[]) || []);

      const { data: joinedData } = await supabase.rpc("get_profile_blitz_joined_list" as any, {
        p_user_id: userId,
      });
      setJoined((joinedData as BlitzItem[]) || []);

      const { data: friendsData } = await supabase.rpc("get_profile_friends_list" as any, {
        p_user_id: userId,
      });
      setFriends((friendsData as FriendItem[]) || []);

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
        <img src={getAvatar(friend.name, friend.avatar_url)} alt={friend.name} loading="lazy" className="w-full h-full object-cover" />
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
